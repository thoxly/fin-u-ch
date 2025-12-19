import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../config/logger';

/**
 * Middleware to generate and attach request ID to requests
 * Uses OpenTelemetry traceId if available (PR6), otherwise generates a UUID
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let requestId: string;
  let traceId: string | undefined;

  // Try to get traceId from OpenTelemetry context (will be available in PR6)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const otelApi = require('@opentelemetry/api');
    if (otelApi && otelApi.trace) {
      const span = otelApi.trace.getActiveSpan();
      if (span) {
        const spanContext = span.spanContext();
        if (spanContext && spanContext.traceId) {
          traceId = spanContext.traceId;
          requestId = traceId;
        } else {
          requestId = randomUUID();
        }
      } else {
        requestId = randomUUID();
      }
    } else {
      requestId = randomUUID();
    }
  } catch (error) {
    // OpenTelemetry not initialized yet, use UUID
    requestId = randomUUID();
  }

  // Add requestId to request object for use in controllers/services
  (req as any).requestId = requestId;

  // Add requestId to response header
  res.setHeader('X-Request-Id', requestId);

  // Add traceId to response header if available
  if (traceId) {
    res.setHeader('X-Trace-Id', traceId);
  }

  // Add requestId to logger context
  const loggerWithContext = logger.child({ requestId });

  // Override req.logger if needed (optional)
  (req as any).logger = loggerWithContext;

  next();
}
