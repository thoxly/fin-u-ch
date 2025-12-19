import winston from 'winston';
import { env } from './env';
import path from 'path';

// Determine project root - use process.cwd() which works in both ESM and CommonJS
// This will point to the workspace root when running from apps/api
const projectRoot = path.resolve(process.cwd(), '../..');

// Custom format to add traceId from OpenTelemetry context (if available)
// This will work once OpenTelemetry is initialized in PR6
const addTraceId = winston.format((info) => {
  try {
    // Try to import OpenTelemetry dynamically (will be available in PR6)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const otelApi = require('@opentelemetry/api');
    if (otelApi && otelApi.context && otelApi.trace) {
      const span = otelApi.trace.getActiveSpan();
      if (span) {
        const spanContext = span.spanContext();
        if (spanContext && spanContext.traceId) {
          info.traceId = spanContext.traceId;
        }
      }
    }
  } catch (error) {
    // OpenTelemetry not initialized yet, ignore
  }
  return info;
});

// Base format with timestamp and error handling
const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  addTraceId()
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
  winston.format.printf(
    ({ timestamp, level, message, requestId, traceId, ...meta }) => {
      const requestInfo = requestId ? `[${requestId}]` : '';
      const traceInfo = traceId ? `[trace:${traceId.substring(0, 8)}]` : '';
      return `${timestamp} [${level}]${requestInfo}${traceInfo}: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`;
    }
  )
);

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    }),
    // File transport for debugging (always JSON)
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
