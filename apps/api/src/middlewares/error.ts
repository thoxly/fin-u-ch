import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error(`AppError: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      userId: (req as any).userId,
      companyId: (req as any).companyId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      query: req.query,
      body:
        req.body && Object.keys(req.body).length > 0 ? '[REDACTED]' : undefined,
    });
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Unexpected errors
  logger.error('Unexpected error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    path: req.path,
    method: req.method,
    userId: (req as any).userId,
    companyId: (req as any).companyId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: req.query,
    body:
      req.body && Object.keys(req.body).length > 0 ? '[REDACTED]' : undefined,
  });
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
