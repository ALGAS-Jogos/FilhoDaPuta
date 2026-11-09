import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { MAX_MESSAGE_BYTES } from '@fdp/protocol';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config.js';
import { RoomManager } from './rooms.js';
import { registerSocketRoutes } from './ws.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.logLevel === 'silent'
        ? false
        : {
            level: config.logLevel,
          },
    trustProxy: config.trustProxy,
  });

  const manager = new RoomManager({
    maxRooms: config.maxRooms,
    roomTtlMs: config.roomTtlMs,
    ...(config.devSeed !== null ? { seed: config.devSeed } : {}),
    log: (message, error) => {
      if (error) {
        app.log.error({ err: error }, message);
      } else {
        app.log.info(message);
      }
    },
  });

  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: MAX_MESSAGE_BYTES,
    },
  });

  registerSocketRoutes(app, manager, config);

  app.get('/healthz', async () => ({
    ok: true,
    rooms: manager.count(),
    uptime: Math.round(process.uptime()),
  }));

  const hasClient = existsSync(join(config.clientDist, 'index.html'));
  if (hasClient) {
    await app.register(fastifyStatic, {
      root: config.clientDist,
      prefix: '/',
    });
  }

  app.setNotFoundHandler((request, reply) => {
    const url = request.raw.url ?? '/';
    const isAsset = /\.[a-zA-Z0-9]+$/.test(url);
    if (
      hasClient &&
      request.method === 'GET' &&
      !url.startsWith('/ws') &&
      !url.startsWith('/healthz') &&
      !isAsset
    ) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'not found' });
  });

  const cleanup = setInterval(() => manager.cleanup(), 60_000);
  cleanup.unref();

  app.addHook('onClose', async () => {
    clearInterval(cleanup);
    manager.destroyAll();
  });

  return app;
}
