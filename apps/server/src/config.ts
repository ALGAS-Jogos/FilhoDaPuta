import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOM_TTL_MS } from '@manilha/protocol';

export interface AppConfig {
  port: number;
  host: string;
  publicOrigin: string | null;
  trustProxy: boolean;
  logLevel: string;
  maxRooms: number;
  roomTtlMs: number;
  clientDist: string;
  isDev: boolean;
  devSeed: number | null;
}

function integer(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: integer(env.PORT, 3000),
    host: env.HOST ?? '0.0.0.0',
    publicOrigin: env.PUBLIC_ORIGIN ? env.PUBLIC_ORIGIN.replace(/\/$/, '') : null,
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
    logLevel: env.LOG_LEVEL ?? 'info',
    maxRooms: integer(env.MAX_ROOMS, 200),
    roomTtlMs: integer(env.ROOM_TTL_MS, ROOM_TTL_MS),
    clientDist: env.CLIENT_DIST
      ? resolve(process.cwd(), env.CLIENT_DIST)
      : fileURLToPath(new URL('../../client/dist', import.meta.url)),
    isDev: env.NODE_ENV !== 'production',
    devSeed: env.DEV_SEED ? integer(env.DEV_SEED, 1) : null,
  };
}
