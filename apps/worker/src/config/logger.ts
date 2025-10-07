import winston from 'winston';
import { env } from './env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    const msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${msg}\n${stack}` : msg;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  logFormat
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});
