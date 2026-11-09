import type { ErrorMessage, StateMessage, WelcomeMessage } from '@manilha/protocol';
import { get, writable } from 'svelte/store';
import { type ConnectionStatus, Net } from './net';
import { applyTheme, getTheme, type ThemeId } from './render/theme';

export interface Session {
  code: string;
  token: string;
  name: string;
  spectator: boolean;
}

export type ToastKind = 'info' | 'error' | 'success';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const SESSION_KEY = 'manilha.session';
const NAME_KEY = 'manilha.name';
const THEME_KEY = 'manilha.theme';

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      typeof parsed.code === 'string' &&
      typeof parsed.token === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.spectator === 'boolean'
    ) {
      return {
        code: parsed.code,
        token: parsed.token,
        name: parsed.name,
        spectator: parsed.spectator,
      };
    }
  } catch {
    // localStorage indisponível ou valor inválido
  }
  return null;
}

function writeSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sem persistência
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // sem persistência
  }
}

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function readTheme(): ThemeId {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'minimal' || value === 'noturno' || value === 'contraste') {
      return value;
    }
  } catch {
    // sem persistência
  }
  return 'minimal';
}

export const gameState = writable<StateMessage | null>(null);
export const connection = writable<ConnectionStatus>('offline');
export const serverOffset = writable(0);
export const toasts = writable<Toast[]>([]);
export const session = writable<Session | null>(readSession());
export const myName = writable(readName());
export const themeId = writable<ThemeId>(readTheme());

let nextToastId = 1;
let pendingJoin: { code: string; name: string; spectate: boolean } | null = null;
let initialized = false;
let wasOnline = false;

export function setTheme(id: ThemeId): void {
  themeId.set(id);
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // sem persistência
  }
  applyTheme(getTheme(id));
}

export function setMyName(name: string): void {
  myName.set(name);
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // sem persistência
  }
}

export function pushToast(kind: ToastKind, text: string): void {
  const id = nextToastId;
  nextToastId += 1;
  toasts.update((current) => [...current, { id, kind, text }]);
  setTimeout(() => dismissToast(id), 4500);
}

export function dismissToast(id: number): void {
  toasts.update((current) => current.filter((toast) => toast.id !== id));
}

export function codeFromPath(): string | null {
  const match = window.location.pathname.match(/^\/sala\/([a-zA-Z0-9]{5})\/?$/);
  return match?.[1]?.toUpperCase() ?? null;
}

function setPath(code: string | null): void {
  const path = code ? `/sala/${code}` : '/';
  if (window.location.pathname !== path) {
    window.history.replaceState({}, '', path);
  }
}

function clearSession(): void {
  session.set(null);
  clearStoredSession();
}

function handleWelcome(message: WelcomeMessage): void {
  const name = get(myName) || (message.spectator ? 'Espectador' : 'Jogador');
  const stored: Session = {
    code: message.roomCode,
    token: message.token,
    name,
    spectator: message.spectator,
  };
  session.set(stored);
  writeSession(stored);
  setPath(message.roomCode);
  if (message.spectator) {
    pushToast('info', 'Você entrou como espectador: as mãos ficam ocultas.');
  }
}

function handleState(message: StateMessage): void {
  gameState.set(message);
  serverOffset.set(message.serverNow - Date.now());
  connection.set('online');
  pendingJoin = null;

  const stored = get(session);
  if (stored) {
    if (stored.name !== message.you.name || stored.code !== message.room.code) {
      const updated = {
        ...stored,
        name: message.you.name,
        code: message.room.code,
        spectator: message.you.isSpectator,
      };
      session.set(updated);
      writeSession(updated);
    }
    setPath(message.room.code);
  }
}

function handleError(message: ErrorMessage): void {
  if (message.code === 'GAME_STARTED' && pendingJoin && !pendingJoin.spectate) {
    pendingJoin = { ...pendingJoin, spectate: true };
    net.send({
      type: 'joinRoom',
      code: pendingJoin.code,
      name: pendingJoin.name,
      spectate: true,
    });
    pushToast('info', 'A partida já começou. Você entrou como espectador.');
    return;
  }

  if (message.code === 'TOKEN_INVALID' || message.code === 'ROOM_NOT_FOUND') {
    clearSession();
    gameState.set(null);
    setPath(null);
    pendingJoin = null;
  }

  if (message.code === 'ROOM_CLOSED') {
    clearSession();
    gameState.set(null);
    setPath(null);
  }

  pushToast('error', message.message);
}

const net = new Net({
  onMessage: (message) => {
    if (message.type === 'welcome') {
      handleWelcome(message);
    } else if (message.type === 'state') {
      handleState(message);
    } else if (message.type === 'error') {
      handleError(message);
    }
  },
  onStatus: (status) => {
    connection.set(status);
    if (status === 'online') {
      wasOnline = true;
    } else if (status === 'offline' && wasOnline) {
      wasOnline = false;
      pushToast('info', 'Conexão caiu. Tentando reconectar…');
    }
  },
  onOpen: () => {
    const stored = get(session);
    if (stored) {
      net.send({ type: 'joinRoom', code: stored.code, token: stored.token });
    }
  },
});

export function initClient(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  applyTheme(getTheme(get(themeId)));

  const pathCode = codeFromPath();
  const stored = get(session);
  if (pathCode && stored && stored.code !== pathCode) {
    clearSession();
    gameState.set(null);
  } else if (!pathCode && stored) {
    setPath(stored.code);
  }

  net.connect();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && get(connection) === 'offline') {
      net.connect();
    }
  });
}

export function createRoom(name: string): void {
  const clean = name.trim();
  if (!clean) {
    pushToast('error', 'Digite seu nome.');
    return;
  }
  setMyName(clean);
  clearSession();
  gameState.set(null);
  pendingJoin = null;
  net.send({ type: 'createRoom', name: clean });
}

export function joinRoom(code: string, name: string, spectate = false): void {
  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim();
  if (!/^[A-Z0-9]{5}$/.test(cleanCode)) {
    pushToast('error', 'Código de sala inválido.');
    return;
  }
  if (!cleanName) {
    pushToast('error', 'Digite seu nome.');
    return;
  }
  setMyName(cleanName);
  const stored = get(session);
  if (stored && stored.code !== cleanCode) {
    clearSession();
  }
  gameState.set(null);
  pendingJoin = { code: cleanCode, name: cleanName, spectate };
  net.send({ type: 'joinRoom', code: cleanCode, name: cleanName, spectate });
}

export function leaveRoom(): void {
  net.send({ type: 'leave' });
  clearSession();
  pendingJoin = null;
  gameState.set(null);
  setPath(null);
}

export function addBot(): void {
  net.send({ type: 'addBot' });
}

export function removeBot(seat: number): void {
  net.send({ type: 'removeBot', seat });
}

export function startGame(): void {
  net.send({ type: 'startGame' });
}

export function restartGame(): void {
  net.send({ type: 'restart' });
}

export function placeBet(value: number): void {
  net.send({ type: 'bet', value });
}

export function playCard(cardId: string): void {
  net.send({ type: 'playCard', cardId });
}

export function confirmRound(): void {
  net.send({ type: 'confirm' });
}

export function vote(choice: 'continue' | 'wait'): void {
  net.send({ type: 'vote', choice });
}

export function inviteUrl(code: string): string {
  return `${window.location.origin}/sala/${code}`;
}

export function disconnectClient(): void {
  net.close();
}
