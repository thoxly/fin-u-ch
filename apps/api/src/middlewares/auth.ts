import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from './error';
import { env } from '../config/env';

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
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.substring(7);

    // Проверяем, является ли это WORKER_API_KEY
    if (env.WORKER_API_KEY && token === env.WORKER_API_KEY) {
      // Это запрос от worker - пропускаем без проверки JWT
      req.isWorker = true;
      return next();
    }

    // Обычная JWT аутентификация для пользователей
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.email = payload.email;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Invalid or expired token', 401));
  }
};
