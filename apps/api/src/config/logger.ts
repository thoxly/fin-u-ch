import winston from 'winston';
import { env } from './env';
import path from 'path';

// Determine project root - use process.cwd() which works in both ESM and CommonJS
// This will point to the workspace root when running from apps/api
const projectRoot = path.resolve(process.cwd(), '../..');

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
    }),
    // Добавляем файловый транспорт для диагностики
    new winston.transports.File({
      filename: path.resolve(projectRoot, 'api-debug.log'),
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
  ],
});

export default logger;
