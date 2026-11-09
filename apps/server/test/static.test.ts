import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';

let app: FastifyInstance;
let root = '';

const config: AppConfig = {
  port: 0,
  host: '127.0.0.1',
  publicOrigin: null,
  trustProxy: false,
  logLevel: 'silent',
  maxRooms: 5,
  roomTtlMs: 60_000,
  clientDist: '',
  isDev: true,
  devSeed: null,
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'manilha-static-'));
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Manilha</title>');
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("manilha")');
  app = await buildApp({ ...config, clientDist: root });
});

afterEach(async () => {
  await app.close();
  await rm(root, { recursive: true, force: true });
});

describe('build do Vite servida pelo servidor', () => {
  it('serve o index, assets e fallback de SPA', async () => {
    const home = await app.inject({ method: 'GET', url: '/' });
    expect(home.statusCode).toBe(200);
    expect(home.body).toContain('Manilha');

    const asset = await app.inject({ method: 'GET', url: '/assets/app.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toContain('manilha');

    const room = await app.inject({ method: 'GET', url: '/sala/ABC12?from=link' });
    expect(room.statusCode).toBe(200);
    expect(room.body).toContain('Manilha');

    const missing = await app.inject({ method: 'GET', url: '/nao-existe.js' });
    expect(missing.statusCode).toBe(404);
  });
});
