import winston from 'winston';
import { config } from './config.js';

export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'monitoring-backend' },
  transports: [
    new winston.transports.Console({
      format: config.isDevelopment
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          )
        : winston.format.json(),
    }),
  ],
});
