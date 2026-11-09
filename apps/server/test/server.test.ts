import type { AddressInfo } from 'node:net';
import type { ClientMessage, ServerMessage, StateMessage, WelcomeMessage } from '@fdp/protocol';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';

const clients: TestClient[] = [];
let app: FastifyInstance;
let url = '';

const config: AppConfig = {
  port: 0,
  host: '127.0.0.1',
  publicOrigin: null,
  trustProxy: false,
  logLevel: 'silent',
  maxRooms: 20,
  roomTtlMs: 60_000,
  clientDist: '/tmp/fdp-client-sem-build',
  isDev: true,
  devSeed: 12345,
};

class TestClient {
  readonly socket: WebSocket;
  private readonly messages: ServerMessage[] = [];
  private readonly waiters: Array<{
    predicate: (message: ServerMessage) => boolean;
    resolve: (message: ServerMessage) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];

  constructor(socketUrl: string) {
    this.socket = new WebSocket(socketUrl);
    this.socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      this.messages.push(message);
      this.flush();
    });
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.once('open', () => resolve());
      this.socket.once('error', reject);
    });
  }

  send(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  waitFor(
    predicate: (message: ServerMessage) => boolean,
    timeout = 10_000,
  ): Promise<ServerMessage> {
    const index = this.messages.findIndex(predicate);
    if (index >= 0) {
      const [message] = this.messages.splice(index, 1);
      if (message) {
        return Promise.resolve(message);
      }
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.splice(
          this.waiters.findIndex((waiter) => waiter.timer === timer),
          1,
        );
        reject(new Error('timeout esperando mensagem'));
      }, timeout);
      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  waitState(predicate: (state: StateMessage) => boolean = () => true): Promise<StateMessage> {
    return this.waitFor(
      (message) => message.type === 'state' && predicate(message),
    ) as Promise<StateMessage>;
  }

  terminate(): void {
    this.socket.terminate();
  }

  private flush(): void {
    for (const waiter of [...this.waiters]) {
      const index = this.messages.findIndex(waiter.predicate);
      if (index < 0) {
        continue;
      }
      const [message] = this.messages.splice(index, 1);
      if (!message) {
        continue;
      }
      clearTimeout(waiter.timer);
      this.waiters.splice(this.waiters.indexOf(waiter), 1);
      waiter.resolve(message);
    }
  }
}

function newClient(): TestClient {
  const client = new TestClient(url);
  clients.push(client);
  return client;
}

async function startRoom(): Promise<{
  a: TestClient;
  b: TestClient;
  code: string;
  aToken: string;
  bToken: string;
  aState: StateMessage;
  bState: StateMessage;
}> {
  const a = newClient();
  await a.open();
  a.send({ type: 'createRoom', name: 'Ana' });
  const aWelcome = (await a.waitFor((message) => message.type === 'welcome')) as WelcomeMessage;
  const initialState = await a.waitState();
  const code = initialState.room.code;

  const b = newClient();
  await b.open();
  b.send({ type: 'joinRoom', code, name: 'Bia' });
  const bWelcome = (await b.waitFor((message) => message.type === 'welcome')) as WelcomeMessage;
  await b.waitState();
  await a.waitState((state) => state.players.length === 2);

  a.send({ type: 'startGame' });
  const aState = await a.waitState((state) => state.game?.phase === 'betting');
  const bState = await b.waitState((state) => state.game?.phase === 'betting');

  return {
    a,
    b,
    code,
    aToken: aWelcome.token,
    bToken: bWelcome.token,
    aState,
    bState,
  };
}

function chooseBet(state: StateMessage): number {
  const game = state.game;
  if (!game || state.you.seat === null) {
    return 0;
  }
  if (state.you.seat === game.dealerSeat) {
    const others = state.players
      .filter((player) => player.seat !== state.you.seat && !player.dead)
      .reduce((total, player) => total + (player.bet ?? 0), 0);
    for (let value = 0; value <= game.cardsThisRound; value += 1) {
      if (others + value !== game.cardsThisRound) {
        return value;
      }
    }
  }
  return 0;
}

async function autoPlayUntilOver(
  client: TestClient,
  initialState?: StateMessage,
): Promise<StateMessage> {
  let lastActedSeq = -1;
  let pendingState = initialState;
  for (;;) {
    const state = pendingState ?? (await client.waitState());
    pendingState = undefined;
    if (!state.game) {
      continue;
    }
    if (state.game.phase === 'gameOver') {
      return state;
    }
    if (state.seq <= lastActedSeq) {
      continue;
    }
    if (state.you.canBet) {
      lastActedSeq = state.seq;
      client.send({ type: 'bet', value: chooseBet(state) });
      continue;
    }
    if (state.you.canPlay) {
      const card = state.you.hand[0];
      if (card) {
        lastActedSeq = state.seq;
        client.send({ type: 'playCard', cardId: card.id });
      }
      continue;
    }
    if (state.you.canConfirm) {
      lastActedSeq = state.seq;
      client.send({ type: 'confirm' });
    }
  }
}

beforeEach(async () => {
  app = await buildApp(config);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address() as AddressInfo;
  url = `ws://127.0.0.1:${address.port}/ws`;
});

afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.terminate();
  }
  await app.close();
});

describe('servidor autoritativo', () => {
  it('mantém a mão privada e entrega visão pública ao espectador', async () => {
    const { aState, bState } = await startRoom();

    expect(aState.you.hand.length + bState.you.hand.length).toBeGreaterThan(0);
    expect(aState.you.allHands).toBeNull();
    expect(bState.you.allHands).toBeNull();

    const spectator = newClient();
    await spectator.open();
    const roomCode = aState.room.code;
    spectator.send({ type: 'joinRoom', code: roomCode, name: 'Olho', spectate: true });
    const welcome = (await spectator.waitFor(
      (message) => message.type === 'welcome',
    )) as WelcomeMessage;
    expect(welcome.spectator).toBe(true);

    const spectatorState = await spectator.waitState();
    expect(spectatorState.you.isSpectator).toBe(true);
    expect(spectatorState.you.seat).toBeNull();
    expect(spectatorState.you.hand).toEqual([]);
    expect(spectatorState.you.allHands).toBeNull();
    expect(spectatorState.you.canPlay).toBe(false);
    expect(spectatorState.players.some((player) => player.cardCount > 0)).toBe(true);
  }, 30_000);

  it('joga uma partida completa com dois humanos', async () => {
    const { a, b, aState, bState } = await startRoom();

    const [aFinal, bFinal] = await Promise.all([
      autoPlayUntilOver(a, aState),
      autoPlayUntilOver(b, bState),
    ]);

    expect(aFinal.game?.phase).toBe('gameOver');
    expect(bFinal.game?.phase).toBe('gameOver');
    expect(aFinal.players.filter((player) => !player.dead).length).toBeLessThanOrEqual(1);
  }, 120_000);

  it('pausa na queda, aceita votação e reconecta o jogador', async () => {
    const { a, b, code, bToken } = await startRoom();

    b.terminate();
    const paused = await a.waitState((state) => state.room.paused);
    expect(paused.room.pause?.disconnectedSeats).toContain(2);
    expect(paused.room.pause?.eligibleSeats).toEqual([1]);

    a.send({ type: 'vote', choice: 'continue' });
    const resumed = await a.waitState((state) => !state.room.paused);
    const botSeat = resumed.players.find((player) => player.seat === 2);
    expect(botSeat?.isBot).toBe(true);
    expect(botSeat?.connected).toBe(false);

    const reconnected = newClient();
    await reconnected.open();
    reconnected.send({ type: 'joinRoom', code, token: bToken });
    await reconnected.waitFor((message) => message.type === 'welcome');
    const reconnectedState = await reconnected.waitState((state) => state.seq > resumed.seq);
    const humanSeat = reconnectedState.players.find((player) => player.seat === 2);
    expect(humanSeat?.isBot).toBe(false);
    expect(humanSeat?.connected).toBe(true);
    expect(reconnectedState.you.seat).toBe(2);
  }, 30_000);
});
