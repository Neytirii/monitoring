import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(async (fastify) => {
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  prisma.$on('error', (e) => {
    logger.error('Prisma error', e);
  });

  await prisma.$connect();
  logger.info('Connected to database');

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    logger.info('Disconnected from database');
  });
});
