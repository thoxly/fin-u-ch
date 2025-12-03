import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from './error';
import { env } from '../config/env';
import logger from '../config/logger';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  isWorker?: boolean;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: missing or invalid auth header', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.substring(7);

    // Проверяем, является ли это WORKER_API_KEY
    if (env.WORKER_API_KEY && token === env.WORKER_API_KEY) {
      // Это запрос от worker - пропускаем без проверки JWT
      logger.debug('Worker API key authentication', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      req.isWorker = true;
      return next();
    }

    // Обычная JWT аутентификация для пользователей
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.email = payload.email;

    logger.debug('User authenticated successfully', {
      userId: payload.userId,
      email: payload.email,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn('Authentication failed', {
        error: error.message,
        statusCode: error.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      return next(error);
    }
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    next(new AppError('Invalid or expired token', 401));
  }
};
