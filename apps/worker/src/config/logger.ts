import winston from 'winston';
import { env } from './env';

// Base format with timestamp and error handling
const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true })
);

// Production: JSON format only
const productionFormat = winston.format.combine(
  baseFormat,
  winston.format.json()
);

// Development: Colorized console output
const developmentFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    const msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${msg}\n${stack}` : msg;
  })
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    }),
  ],
});
