import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { config } from '../config.js';
import { logger } from '../logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    redisSub: Redis;
  }
}

export const websocketPlugin = fp(async (fastify) => {
  const redis = new Redis(config.redisUrl);
  const redisSub = new Redis(config.redisUrl);

  redis.on('error', (err) => logger.error('Redis error', err));
  redisSub.on('error', (err) => logger.error('Redis sub error', err));

  fastify.decorate('redis', redis);
  fastify.decorate('redisSub', redisSub);

  fastify.get('/ws', { websocket: true }, (socket, request) => {
    const tenantId = (request.query as Record<string, string>)['tenantId'];

    if (!tenantId) {
      socket.close(1008, 'Missing tenantId');
      return;
    }

    const channel = `tenant:${tenantId}:metrics`;

    const handler = (ch: string, message: string) => {
      if (ch === channel && socket.readyState === 1) {
        socket.send(message);
      }
    };

    redisSub.subscribe(channel, (err) => {
      if (err) logger.error('Redis subscribe error', err);
    });

    redisSub.on('message', handler);

    socket.on('close', () => {
      redisSub.removeListener('message', handler);
    });

    socket.on('error', (err) => {
      logger.error('WebSocket error', err);
    });
  });

  fastify.addHook('onClose', async () => {
    await redis.quit();
    await redisSub.quit();
  });
});
