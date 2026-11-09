import {
  type ClientMessage,
  ClientMessageSchema,
  type ErrorCode,
  MAX_MESSAGE_BYTES,
  type PongMessage,
  type ServerMessage,
  type WelcomeMessage,
} from '@manilha/protocol';
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { AppConfig } from './config.js';
import { errorMessage, ServerError } from './errors.js';
import { newId, newToken, type Room, type RoomPlayer } from './room.js';
import type { RoomManager } from './rooms.js';

interface Session {
  socket: WebSocket;
  room: Room | null;
  playerId: string | null;
  spectator: boolean;
  messageTimes: number[];
  alive: boolean;
  closed: boolean;
}

const RATE_LIMIT_WINDOW_MS = 5_000;
const RATE_LIMIT_MAX = 25;

export function registerSocketRoutes(
  app: FastifyInstance,
  manager: RoomManager,
  config: AppConfig,
): void {
  const sessions = new Set<Session>();

  const heartbeat = setInterval(() => {
    for (const session of sessions) {
      if (!session.alive) {
        session.socket.terminate();
        continue;
      }
      session.alive = false;
      try {
        session.socket.ping();
      } catch {
        session.socket.terminate();
      }
    }
  }, 20_000);
  heartbeat.unref();

  app.addHook('onClose', async () => {
    clearInterval(heartbeat);
  });

  app.get('/ws', { websocket: true }, (socket, request) => {
    const origin = request.headers.origin;
    if (config.publicOrigin && origin && origin !== config.publicOrigin) {
      socket.close(1008, 'origem não permitida');
      return;
    }

    const session: Session = {
      socket,
      room: null,
      playerId: null,
      spectator: false,
      messageTimes: [],
      alive: true,
      closed: false,
    };
    sessions.add(session);

    socket.on('pong', () => {
      session.alive = true;
    });

    socket.on('message', (raw) => {
      handleRawMessage(session, raw, manager, config);
    });

    socket.on('error', (error) => {
      app.log.debug({ err: error }, 'erro no websocket');
    });

    socket.on('close', () => {
      if (session.closed) {
        return;
      }
      session.closed = true;
      if (session.room && session.playerId) {
        session.room.handleDisconnect(session.playerId, session.spectator, socket);
      }
      sessions.delete(session);
    });
  });
}

function handleRawMessage(
  session: Session,
  raw: unknown,
  manager: RoomManager,
  config: AppConfig,
): void {
  const now = Date.now();
  session.messageTimes = session.messageTimes.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (session.messageTimes.length >= RATE_LIMIT_MAX) {
    sendError(session.socket, 'RATE_LIMITED', 'Muitas mensagens. Aguarde um pouco.');
    return;
  }
  session.messageTimes.push(now);

  const text = typeof raw === 'string' ? raw : String(raw);
  if (Buffer.byteLength(text, 'utf8') > MAX_MESSAGE_BYTES) {
    sendError(session.socket, 'BAD_MESSAGE', 'Mensagem grande demais.');
    return;
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    sendError(session.socket, 'BAD_MESSAGE', 'JSON inválido.');
    return;
  }

  const parsed = ClientMessageSchema.safeParse(json);
  if (!parsed.success) {
    sendError(session.socket, 'BAD_MESSAGE', 'Mensagem inválida.');
    return;
  }

  try {
    handleMessage(session, parsed.data, manager, config);
  } catch (error) {
    if (error instanceof ServerError) {
      sendError(session.socket, error.code, error.message);
      return;
    }
    console.error('erro inesperado no websocket', error);
    sendError(session.socket, 'INTERNAL', 'Erro interno.');
  }
}

function handleMessage(
  session: Session,
  message: ClientMessage,
  manager: RoomManager,
  _config: AppConfig,
): void {
  if (message.type === 'ping') {
    const pong: PongMessage = { type: 'pong', serverNow: Date.now() };
    send(session.socket, pong);
    return;
  }

  if (message.type === 'createRoom') {
    if (session.room) {
      throw new ServerError('BAD_MESSAGE', 'Você já está em uma sala.');
    }
    const name = sanitizeName(message.name);
    const room = manager.create();
    try {
      const player = room.addHuman(newId(), newToken(), name, session.socket);
      attachSession(session, room, player.id, false);
      sendWelcome(session, player.token, room.code, false);
      room.broadcast();
    } catch (error) {
      manager.remove(room);
      throw error;
    }
    return;
  }

  if (message.type === 'joinRoom') {
    if (session.room) {
      throw new ServerError('BAD_MESSAGE', 'Você já está em uma sala.');
    }
    const room = manager.get(message.code);
    if (!room) {
      throw new ServerError('ROOM_NOT_FOUND', 'Sala não encontrada.');
    }

    if (message.token) {
      const player = tryAttachPlayer(room, message.token, session.socket);
      if (player) {
        attachSession(session, room, player.id, false);
        sendWelcome(session, player.token, room.code, false);
        room.broadcast();
        return;
      }
      const spectator = tryAttachSpectator(room, message.token, session.socket);
      if (spectator) {
        attachSession(session, room, spectator.id, true);
        sendWelcome(session, spectator.token, room.code, true);
        room.broadcast();
        return;
      }
      throw new ServerError('TOKEN_INVALID', 'Sessão inválida ou expirada.');
    }

    if (message.spectate) {
      const name = sanitizeName(message.name ?? 'Espectador');
      const spectator = room.addSpectator(newId(), newToken(), name, session.socket);
      attachSession(session, room, spectator.id, true);
      sendWelcome(session, spectator.token, room.code, true);
      room.broadcast();
      return;
    }

    if (room.state) {
      throw new ServerError('GAME_STARTED', 'A partida já começou. Entre como espectador.');
    }

    const name = sanitizeName(message.name ?? '');
    const player = room.addHuman(newId(), newToken(), name, session.socket);
    attachSession(session, room, player.id, false);
    sendWelcome(session, player.token, room.code, false);
    room.broadcast();
    return;
  }

  if (message.type === 'leave') {
    if (session.room && session.playerId) {
      session.room.leave(session.playerId);
    }
    session.room = null;
    session.playerId = null;
    session.spectator = false;
    return;
  }

  const room = session.room;
  const player = room && session.playerId ? room.playerById(session.playerId) : undefined;
  if (!room || !player || session.spectator) {
    throw new ServerError('NOT_IN_GAME', 'Você não está jogando nesta sala.');
  }

  switch (message.type) {
    case 'addBot':
      room.addBot(player.seat);
      break;
    case 'removeBot':
      room.removeBot(player.seat, message.seat);
      break;
    case 'startGame':
      room.startGame(player.seat);
      break;
    case 'restart':
      room.restart(player.seat);
      break;
    case 'bet':
      room.placeBet(player.seat, message.value);
      break;
    case 'playCard':
      room.playCard(player.seat, message.cardId);
      break;
    case 'confirm':
      room.confirm(player.seat);
      break;
    case 'vote':
      room.vote(player.seat, message.choice);
      break;
    default:
      break;
  }
}

function attachSession(session: Session, room: Room, playerId: string, spectator: boolean): void {
  session.room = room;
  session.playerId = playerId;
  session.spectator = spectator;
}

function tryAttachPlayer(room: Room, token: string, socket: WebSocket): RoomPlayer | null {
  try {
    return room.attachPlayerByToken(token, socket);
  } catch (error) {
    if (error instanceof ServerError && error.code === 'TOKEN_INVALID') {
      return null;
    }
    throw error;
  }
}

function tryAttachSpectator(
  room: Room,
  token: string,
  socket: WebSocket,
): { id: string; token: string } | null {
  try {
    const spectator = room.attachSpectatorByToken(token, socket);
    return { id: spectator.id, token: spectator.token };
  } catch (error) {
    if (error instanceof ServerError && error.code === 'TOKEN_INVALID') {
      return null;
    }
    throw error;
  }
}

function sendWelcome(session: Session, token: string, roomCode: string, spectator: boolean): void {
  const welcome: WelcomeMessage = {
    type: 'welcome',
    playerId: session.playerId ?? '',
    token,
    roomCode,
    spectator,
    serverNow: Date.now(),
  };
  send(session.socket, welcome);
}

function sanitizeName(value: string): string {
  const cleaned = [...value]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    })
    .join('');
  const name = cleaned.trim().slice(0, 16);
  if (!name) {
    throw new ServerError('BAD_NAME', 'Digite um nome.');
  }
  return name;
}

function sendError(socket: WebSocket, code: ErrorCode, message: string): void {
  send(socket, { type: 'error', code, message });
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState !== 1) {
    return;
  }
  try {
    socket.send(JSON.stringify(message));
  } catch (error) {
    console.error('erro ao enviar mensagem', errorMessage(error));
  }
}
