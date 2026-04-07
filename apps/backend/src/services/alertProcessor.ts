import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../logger.js';
import { config } from '../config.js';

export interface AlertEvaluationJob {
  tenantId: string;
  hostId: string;
  metricName: string;
  value: number;
  timestamp: string;
}

const expressionSchema = z.object({
  metric: z.string(),
  operator: z.enum(['>', '>=', '<', '<=', '==', '=', '!=']),
  threshold: z.number(),
});

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const alertQueue = new Queue<AlertEvaluationJob>('alert-evaluation', { connection });

export function startAlertProcessor(prisma: PrismaClient) {
  const worker = new Worker<AlertEvaluationJob>(
    'alert-evaluation',
    async (job) => {
      const { tenantId, hostId, metricName, value } = job.data;

      const triggers = await prisma.trigger.findMany({
        where: { tenantId, enabled: true },
      });

      for (const trigger of triggers) {
        const expressionParsed = expressionSchema.safeParse(trigger.expression);

        if (!expressionParsed.success) {
          logger.warn(`Trigger ${trigger.id} has invalid expression, skipping`, {
            errors: expressionParsed.error.errors,
          });
          continue;
        }

        const expression = expressionParsed.data;

        if (expression.metric !== metricName) continue;

        const exceeded = evaluateExpression(expression.operator, value, expression.threshold);

        const existingAlert = await prisma.alert.findFirst({
          where: { triggerId: trigger.id, hostId, state: 'FIRING' },
        });

        if (exceeded && !existingAlert) {
          await prisma.alert.create({
            data: {
              triggerId: trigger.id,
              hostId,
              state: 'FIRING',
              message: `${metricName} is ${value} (threshold: ${expression.operator} ${expression.threshold})`,
            },
          });
          logger.info(`Alert fired: trigger=${trigger.id} host=${hostId} metric=${metricName}`);
        } else if (!exceeded && existingAlert) {
          await prisma.alert.update({
            where: { id: existingAlert.id },
            data: { state: 'RESOLVED', resolvedAt: new Date() },
          });
          logger.info(`Alert resolved: trigger=${trigger.id} host=${hostId}`);
        }
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    logger.error(`Alert evaluation job ${job?.id} failed`, err);
  });

  return worker;
}

function evaluateExpression(operator: string, value: number, threshold: number): boolean {
  switch (operator) {
    case '>':
      return value > threshold;
    case '>=':
      return value >= threshold;
    case '<':
      return value < threshold;
    case '<=':
      return value <= threshold;
    case '==':
    case '=':
      return value === threshold;
    case '!=':
      return value !== threshold;
    default:
      return false;
  }
}
