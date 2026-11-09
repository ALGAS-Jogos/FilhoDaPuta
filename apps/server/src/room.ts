import { randomBytes, randomUUID } from 'node:crypto';
import {
  activePlayers,
  autoAct,
  clearTrick,
  confirmRound,
  createGame,
  createRng,
  GameError,
  type GameState,
  placeBet,
  playCard,
  type Rng,
} from '@manilha/engine';
import {
  CONFIRM_MS,
  MAX_PLAYERS,
  RECONNECT_MIN_MS,
  TRICK_DISPLAY_MS,
  TURN_MS,
  type VoteChoice,
} from '@manilha/protocol';
import type { WebSocket } from 'ws';
import { ServerError } from './errors.js';
import { projectRoom } from './project.js';

export interface RoomPlayer {
  id: string;
  token: string;
  name: string;
  seat: number;
  isBot: boolean;
  connected: boolean;
  socket: WebSocket | null;
}

export interface RoomSpectator {
  id: string;
  token: string;
  name: string;
  connected: boolean;
  socket: WebSocket | null;
}

export interface PauseState {
  disconnectedSeats: number[];
  eligibleSeats: number[];
  votes: Map<number, VoteChoice>;
  startedAt: number;
  majority: number;
  remainingMs: number;
}

export interface RoomHooks {
  onEmpty: (room: Room) => void;
  log?: (message: string, error?: unknown) => void;
}

const MAX_SPECTATORS = 20;

export function newToken(): string {
  return randomBytes(32).toString('hex');
}

export function newId(): string {
  return randomUUID();
}

export class Room {
  readonly code: string;
  readonly rng: Rng;
  players: RoomPlayer[] = [];
  spectators: RoomSpectator[] = [];
  state: GameState | null = null;
  hostSeat: number | null = null;
  seq = 0;
  paused = false;
  pause: PauseState | null = null;
  deadline: number | null = null;
  createdAt = Date.now();
  lastActivity = Date.now();

  private deadlinePhase: GameState['phase'] | null = null;
  private timers: NodeJS.Timeout[] = [];
  private destroyed = false;

  constructor(
    code: string,
    seed: number,
    private readonly hooks: RoomHooks,
  ) {
    this.code = code;
    this.rng = createRng(seed);
  }

  addHuman(id: string, token: string, name: string, socket: WebSocket): RoomPlayer {
    if (this.state) {
      throw new ServerError('GAME_STARTED', 'A partida já começou.');
    }
    if (this.players.length >= MAX_PLAYERS) {
      throw new ServerError('ROOM_FULL', 'A sala está cheia.');
    }
    const seat = this.nextFreeSeat();
    if (seat === null) {
      throw new ServerError('ROOM_FULL', 'A sala está cheia.');
    }
    const player: RoomPlayer = {
      id,
      token,
      name,
      seat,
      isBot: false,
      connected: true,
      socket,
    };
    this.players.push(player);
    this.players.sort((a, b) => a.seat - b.seat);
    if (this.hostSeat === null) {
      this.hostSeat = seat;
    }
    this.touch();
    return player;
  }

  addSpectator(id: string, token: string, name: string, socket: WebSocket): RoomSpectator {
    if (this.spectators.length >= MAX_SPECTATORS) {
      throw new ServerError('ROOM_FULL', 'Limite de espectadores atingido.');
    }
    const spectator: RoomSpectator = {
      id,
      token,
      name,
      connected: true,
      socket,
    };
    this.spectators.push(spectator);
    this.touch();
    return spectator;
  }

  addBot(actorSeat: number | null): void {
    this.requireHost(actorSeat);
    if (this.state) {
      throw new ServerError('GAME_STARTED', 'A partida já começou.');
    }
    if (this.players.length >= MAX_PLAYERS) {
      throw new ServerError('ROOM_FULL', 'A sala está cheia.');
    }
    const seat = this.nextFreeSeat();
    if (seat === null) {
      throw new ServerError('ROOM_FULL', 'A sala está cheia.');
    }
    this.players.push({
      id: `bot-${randomUUID()}`,
      token: '',
      name: `Bot ${seat}`,
      seat,
      isBot: true,
      connected: true,
      socket: null,
    });
    this.players.sort((a, b) => a.seat - b.seat);
    this.broadcast();
  }

  removeBot(actorSeat: number | null, seat: number): void {
    this.requireHost(actorSeat);
    if (this.state) {
      throw new ServerError('GAME_STARTED', 'A partida já começou.');
    }
    const player = this.playerBySeat(seat);
    if (!player?.isBot) {
      throw new ServerError('NOT_IN_GAME', 'Esse assento não é de um bot.');
    }
    this.players = this.players.filter((candidate) => candidate.id !== player.id);
    this.broadcast();
    this.maybeEmpty();
  }

  startGame(actorSeat: number | null): void {
    this.requireHost(actorSeat);
    if (this.state) {
      throw new ServerError('GAME_STARTED', 'A partida já começou.');
    }
    if (this.players.length < 2) {
      throw new ServerError('NOT_ENOUGH_PLAYERS', 'São necessários pelo menos 2 jogadores.');
    }
    if (this.players.some((player) => !player.connected)) {
      throw new ServerError('PLAYERS_DISCONNECTED', 'Aguarde os jogadores desconectados.');
    }
    if (this.hostSeat === null) {
      throw new ServerError('NOT_HOST', 'A sala não tem host.');
    }

    this.state = createGame(
      this.players.map((player) => ({
        seat: player.seat,
        name: player.name,
        isBot: player.isBot,
        connected: player.connected,
      })),
      this.hostSeat,
      this.rng,
    );
    this.paused = false;
    this.pause = null;
    this.deadline = null;
    this.deadlinePhase = null;
    this.clearTimers();
    this.syncEngineFlags();
    this.touch();
    this.schedule(true);
    this.broadcast();
  }

  restart(actorSeat: number | null): void {
    this.requireHost(actorSeat);
    if (this.state?.phase !== 'gameOver') {
      throw new ServerError('NOT_IN_GAME', 'A partida ainda não terminou.');
    }
    this.state = null;
    this.paused = false;
    this.pause = null;
    this.deadline = null;
    this.deadlinePhase = null;
    this.clearTimers();
    this.players = this.players.filter((player) => player.connected || player.isBot);
    this.migrateHost();
    this.touch();
    this.broadcast();
    this.maybeEmpty();
  }

  placeBet(seat: number, value: number): void {
    this.requireInteractive();
    this.applyGame(() => placeBet(this.requireState(), seat, value));
  }

  playCard(seat: number, cardId: string): void {
    this.requireInteractive();
    this.applyGame(() => playCard(this.requireState(), seat, cardId));
  }

  confirm(seat: number): void {
    this.requireInteractive();
    this.applyGame(
      () => confirmRound(this.requireState(), seat, this.rng),
      'CANNOT_CONFIRM',
      false,
    );
  }

  vote(seat: number, choice: VoteChoice): void {
    if (!this.paused || !this.pause) {
      throw new ServerError('CANNOT_VOTE', 'Não há votação em andamento.');
    }
    const player = this.playerBySeat(seat);
    if (!player || player.isBot || !player.connected || !this.pause.eligibleSeats.includes(seat)) {
      throw new ServerError('CANNOT_VOTE', 'Você não pode votar nesta pausa.');
    }

    this.pause.votes.set(seat, choice);
    const continueVotes = [...this.pause.votes.values()].filter(
      (vote) => vote === 'continue',
    ).length;
    const waitVotes = [...this.pause.votes.values()].filter((vote) => vote === 'wait').length;

    if (this.pause.majority > 0 && continueVotes >= this.pause.majority) {
      for (const disconnectedSeat of this.pause.disconnectedSeats) {
        const disconnected = this.playerBySeat(disconnectedSeat);
        const enginePlayer = this.playerState(disconnectedSeat);
        if (disconnected && enginePlayer && !enginePlayer.dead && !disconnected.isBot) {
          disconnected.isBot = true;
          disconnected.connected = false;
        }
      }
      this.syncEngineFlags();
      this.resume();
    } else if (this.pause.majority > 0 && waitVotes >= this.pause.majority) {
      this.touch();
    }

    this.broadcast();
  }

  leave(playerId: string): void {
    const spectator = this.spectators.find((candidate) => candidate.id === playerId);
    if (spectator) {
      this.spectators = this.spectators.filter((candidate) => candidate.id !== playerId);
      this.touch();
      this.broadcast();
      this.maybeEmpty();
      return;
    }

    const player = this.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return;
    }

    if (this.state && this.state.phase !== 'gameOver') {
      player.socket = null;
      player.connected = false;
      if (!this.playerState(player.seat)?.dead) {
        player.isBot = true;
      }
      this.syncEngineFlags();
      if (this.state.turnSeat === player.seat || this.state.phase === 'roundEnd') {
        this.schedule(true);
      }
      this.migrateHost();
      this.touch();
      this.broadcast();
      return;
    }

    this.players = this.players.filter((candidate) => candidate.id !== playerId);
    this.migrateHost();
    this.touch();
    this.broadcast();
    this.maybeEmpty();
  }

  removeSpectator(playerId: string): void {
    this.spectators = this.spectators.filter((candidate) => candidate.id !== playerId);
    this.touch();
    this.broadcast();
    this.maybeEmpty();
  }

  attachPlayerByToken(token: string, socket: WebSocket): RoomPlayer {
    const player = this.players.find((candidate) => candidate.token === token);
    if (!player) {
      throw new ServerError('TOKEN_INVALID', 'Sessão inválida ou expirada.');
    }

    if (player.socket && player.socket !== socket) {
      player.socket.close(4001, 'outra conexão');
    }
    player.socket = socket;
    player.connected = true;
    player.isBot = false;
    this.syncEngineFlags();

    if (this.hostSeat === null && !player.isBot) {
      this.hostSeat = player.seat;
    }

    if (this.paused && this.pause) {
      this.pause.disconnectedSeats = this.pause.disconnectedSeats.filter(
        (seat) => seat !== player.seat,
      );
      this.refreshVoters();
      if (this.pause.disconnectedSeats.length === 0) {
        this.resume();
      }
    } else if (this.state && this.state.phase !== 'gameOver') {
      this.schedule(true);
    }

    this.touch();
    return player;
  }

  attachSpectatorByToken(token: string, socket: WebSocket): RoomSpectator {
    const spectator = this.spectators.find((candidate) => candidate.token === token);
    if (!spectator) {
      throw new ServerError('TOKEN_INVALID', 'Sessão inválida ou expirada.');
    }
    if (spectator.socket && spectator.socket !== socket) {
      spectator.socket.close(4001, 'outra conexão');
    }
    spectator.socket = socket;
    spectator.connected = true;
    this.touch();
    return spectator;
  }

  handleDisconnect(playerId: string, spectator: boolean, socket: WebSocket): void {
    if (spectator) {
      const found = this.spectators.find((candidate) => candidate.id === playerId);
      if (!found || found.socket !== socket) {
        return;
      }
      found.socket = null;
      found.connected = false;
      if (!this.state || this.state.phase === 'gameOver') {
        this.spectators = this.spectators.filter((candidate) => candidate.id !== playerId);
      }
      this.touch();
      this.broadcast();
      this.maybeEmpty();
      return;
    }

    const player = this.players.find((candidate) => candidate.id === playerId);
    if (!player || player.socket !== socket) {
      return;
    }
    player.socket = null;
    player.connected = false;

    if (!this.state || this.state.phase === 'gameOver') {
      this.players = this.players.filter((candidate) => candidate.id !== playerId);
      this.migrateHost();
      this.touch();
      this.broadcast();
      this.maybeEmpty();
      return;
    }

    this.syncEngineFlags();
    const enginePlayer = this.playerState(player.seat);
    if (enginePlayer && !enginePlayer.dead && !player.isBot) {
      this.startPause(player.seat);
    } else if (this.paused) {
      this.refreshVoters();
    }
    this.migrateHost();
    this.touch();
    this.broadcast();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.clearTimers();
    for (const player of this.players) {
      player.socket?.close(1001, 'sala encerrada');
    }
    for (const spectator of this.spectators) {
      spectator.socket?.close(1001, 'sala encerrada');
    }
  }

  broadcast(): void {
    if (this.destroyed) {
      return;
    }
    this.seq += 1;
    this.touch();

    for (const player of this.players) {
      if (!player.socket || !player.connected) {
        continue;
      }
      this.send(player.socket, projectRoom(this, { kind: 'player', player }));
    }
    for (const spectator of this.spectators) {
      if (!spectator.socket || !spectator.connected) {
        continue;
      }
      this.send(spectator.socket, projectRoom(this, { kind: 'spectator', spectator }));
    }
  }

  connectedActors(): number {
    const players = this.players.filter((player) => player.connected && !player.isBot).length;
    const spectators = this.spectators.filter((spectator) => spectator.connected).length;
    return players + spectators;
  }

  spectatorCount(): number {
    return this.spectators.filter((spectator) => spectator.connected).length;
  }

  playerBySeat(seat: number): RoomPlayer | undefined {
    return this.players.find((player) => player.seat === seat);
  }

  playerById(id: string): RoomPlayer | undefined {
    return this.players.find((player) => player.id === id);
  }

  playerState(seat: number): GameState['players'][number] | undefined {
    return this.state?.players.find((player) => player.seat === seat);
  }

  private applyGame(
    action: () => void,
    fallbackCode: 'CANNOT_CONFIRM' | 'NOT_IN_GAME' = 'NOT_IN_GAME',
    resetDeadline = true,
  ): void {
    try {
      action();
    } catch (error) {
      if (error instanceof GameError) {
        const code =
          error.code === 'NOT_YOUR_TURN'
            ? 'NOT_YOUR_TURN'
            : error.code === 'INVALID_BET'
              ? 'INVALID_BET'
              : error.code === 'CARD_NOT_IN_HAND'
                ? 'CARD_NOT_IN_HAND'
                : fallbackCode;
        throw new ServerError(code, error.message);
      }
      throw error;
    }
    this.afterChange(resetDeadline);
  }

  private requireInteractive(): void {
    if (!this.state) {
      throw new ServerError('NOT_IN_GAME', 'Não há partida em andamento.');
    }
    if (this.paused) {
      throw new ServerError('NOT_IN_GAME', 'A partida está pausada.');
    }
  }

  private requireState(): GameState {
    if (!this.state) {
      throw new ServerError('NOT_IN_GAME', 'Não há partida em andamento.');
    }
    return this.state;
  }

  private requireHost(seat: number | null): void {
    if (seat === null || this.hostSeat !== seat) {
      throw new ServerError('NOT_HOST', 'Somente o host pode fazer isso.');
    }
  }

  private nextFreeSeat(): number | null {
    for (let seat = 1; seat <= MAX_PLAYERS; seat += 1) {
      if (!this.players.some((player) => player.seat === seat)) {
        return seat;
      }
    }
    return null;
  }

  private startPause(seat: number): void {
    if (!this.state || this.state.phase === 'gameOver' || this.paused) {
      if (this.paused && this.pause && !this.pause.disconnectedSeats.includes(seat)) {
        this.pause.disconnectedSeats.push(seat);
        this.refreshVoters();
      }
      return;
    }

    const remainingMs = this.remainingMs();
    this.paused = true;
    this.pause = {
      disconnectedSeats: [seat],
      eligibleSeats: [],
      votes: new Map(),
      startedAt: Date.now(),
      majority: 0,
      remainingMs,
    };
    this.deadline = null;
    this.deadlinePhase = null;
    this.clearTimers();
    this.refreshVoters();
  }

  private remainingMs(): number {
    if (this.deadline) {
      return Math.max(0, this.deadline - Date.now());
    }
    if (this.state?.phase === 'trickEnd') {
      return TRICK_DISPLAY_MS;
    }
    if (this.state?.phase === 'roundEnd') {
      return CONFIRM_MS;
    }
    return TURN_MS;
  }

  private refreshVoters(): void {
    if (!this.pause) {
      return;
    }
    this.pause.eligibleSeats = this.players
      .filter((player) => !player.isBot && player.connected)
      .map((player) => player.seat)
      .sort((a, b) => a - b);
    this.pause.majority = Math.floor(this.pause.eligibleSeats.length / 2) + 1;
    this.pause.votes.clear();
  }

  private resume(): void {
    const remaining = this.pause?.remainingMs ?? TURN_MS;
    this.paused = false;
    this.pause = null;
    this.deadline = Date.now() + Math.max(remaining, RECONNECT_MIN_MS);
    this.deadlinePhase = this.state?.phase ?? null;
    this.schedule(false);
  }

  private migrateHost(): void {
    if (this.hostSeat !== null) {
      const current = this.playerBySeat(this.hostSeat);
      if (current?.connected && !current.isBot) {
        return;
      }
    }
    const next = this.players
      .filter((player) => player.connected && !player.isBot)
      .sort((a, b) => a.seat - b.seat)[0];
    this.hostSeat = next?.seat ?? null;
  }

  private syncEngineFlags(): void {
    if (!this.state) {
      return;
    }
    for (const player of this.players) {
      const enginePlayer = this.state.players.find((candidate) => candidate.seat === player.seat);
      if (enginePlayer) {
        enginePlayer.isBot = player.isBot;
        enginePlayer.connected = player.connected;
      }
    }
  }

  private afterChange(resetDeadline: boolean): void {
    if (this.state?.phase === 'gameOver') {
      this.paused = false;
      this.pause = null;
      this.deadline = null;
      this.deadlinePhase = null;
      this.clearTimers();
    } else {
      this.schedule(resetDeadline);
    }
    this.broadcast();
  }

  private schedule(resetDeadline: boolean): void {
    this.clearTimers();
    const state = this.state;
    if (this.paused || !state || state.phase === 'gameOver') {
      this.deadline = null;
      this.deadlinePhase = null;
      return;
    }

    if (state.phase === 'trickEnd') {
      this.deadline = null;
      this.deadlinePhase = null;
      this.addTimer(
        setTimeout(() => {
          if (this.state?.phase !== 'trickEnd' || this.paused) {
            return;
          }
          try {
            clearTrick(this.state);
            this.afterChange(true);
          } catch (error) {
            this.log('erro ao limpar fez', error);
          }
        }, TRICK_DISPLAY_MS),
      );
      return;
    }

    if (state.phase === 'betting' || state.phase === 'playing') {
      const seat = state.turnSeat;
      if (seat === null) {
        return;
      }
      const player = this.playerBySeat(seat);
      if (!player) {
        return;
      }
      if (player.isBot) {
        this.deadline = null;
        this.deadlinePhase = null;
        this.addTimer(
          setTimeout(() => this.runBotTurn(seat), 650 + Math.floor(Math.random() * 450)),
        );
        return;
      }
      if (!player.connected) {
        this.startPause(seat);
        return;
      }
      this.setDeadline(state.phase, TURN_MS, resetDeadline);
      const delay = Math.max(0, (this.deadline ?? Date.now()) - Date.now());
      this.addTimer(setTimeout(() => this.runTurnTimeout(seat), delay));
      return;
    }

    if (state.phase === 'roundEnd') {
      this.setDeadline('roundEnd', CONFIRM_MS, resetDeadline);
      const pendingBots = activePlayers(state).filter(
        (player) => player.isBot && !player.confirmed,
      );
      if (pendingBots.length > 0) {
        this.addTimer(setTimeout(() => this.runBotConfirms(), 500));
      }
      const delay = Math.max(0, (this.deadline ?? Date.now()) - Date.now());
      this.addTimer(setTimeout(() => this.runConfirmTimeout(), delay));
    }
  }

  private setDeadline(phase: GameState['phase'], duration: number, reset: boolean): void {
    if (reset || !this.deadline || this.deadline <= Date.now() || this.deadlinePhase !== phase) {
      this.deadline = Date.now() + duration;
      this.deadlinePhase = phase;
    }
  }

  private runTurnTimeout(seat: number): void {
    const state = this.state;
    if (!state || this.paused || state.turnSeat !== seat) {
      return;
    }
    if (state.phase !== 'betting' && state.phase !== 'playing') {
      return;
    }
    try {
      autoAct(state, seat, this.rng);
      this.afterChange(true);
    } catch (error) {
      this.log('erro no timeout de turno', error);
    }
  }

  private runBotTurn(seat: number): void {
    const state = this.state;
    if (!state || this.paused || state.turnSeat !== seat) {
      return;
    }
    if (state.phase !== 'betting' && state.phase !== 'playing') {
      return;
    }
    const player = this.playerBySeat(seat);
    if (!player?.isBot) {
      return;
    }
    try {
      autoAct(state, seat, this.rng);
      this.afterChange(true);
    } catch (error) {
      this.log('erro no bot', error);
    }
  }

  private runBotConfirms(): void {
    const state = this.state;
    if (!state || this.paused || state.phase !== 'roundEnd') {
      return;
    }
    try {
      for (const player of activePlayers(state)) {
        if (this.state?.phase !== 'roundEnd') {
          break;
        }
        if (player.isBot && !player.confirmed) {
          confirmRound(state, player.seat, this.rng);
        }
      }
      this.afterChange(false);
    } catch (error) {
      this.log('erro na confirmação dos bots', error);
    }
  }

  private runConfirmTimeout(): void {
    const state = this.state;
    if (!state || this.paused || state.phase !== 'roundEnd') {
      return;
    }
    try {
      for (const player of activePlayers(state)) {
        if (this.state?.phase !== 'roundEnd') {
          break;
        }
        if (!player.confirmed) {
          confirmRound(state, player.seat, this.rng);
        }
      }
      this.afterChange(true);
    } catch (error) {
      this.log('erro na confirmação automática', error);
    }
  }

  private addTimer(timer: NodeJS.Timeout): void {
    this.timers.push(timer);
  }

  private clearTimers(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
  }

  private send(socket: WebSocket, message: unknown): void {
    if (socket.readyState !== 1) {
      return;
    }
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      this.log('erro ao enviar estado', error);
    }
  }

  private touch(): void {
    this.lastActivity = Date.now();
  }

  private maybeEmpty(): void {
    if (this.destroyed) {
      return;
    }
    if (this.players.length === 0 && this.spectators.length === 0) {
      this.hooks.onEmpty(this);
    }
  }

  private log(message: string, error?: unknown): void {
    this.hooks.log?.(`[sala ${this.code}] ${message}`, error);
  }
}
