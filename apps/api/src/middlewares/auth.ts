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
    // Используем process.env напрямую, чтобы получить актуальное значение
    const workerApiKey = process.env.WORKER_API_KEY || env.WORKER_API_KEY;

    if (workerApiKey) {
      if (token === workerApiKey) {
        // Это запрос от worker - пропускаем без проверки JWT
        req.isWorker = true;
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] ✅ Worker request authenticated');
        }
        return next();
      } else {
        // Логируем для отладки (только в dev режиме)
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] WORKER_API_KEY mismatch:', {
            receivedLength: token.length,
            expectedLength: workerApiKey.length,
            receivedStart: token.substring(0, 10),
            expectedStart: workerApiKey.substring(0, 10),
          });
        }
      }
    } else {
      // Всегда логируем, если ключ не настроен (критично для работы worker)
      console.warn('[Auth] ⚠️  WORKER_API_KEY not configured in API');
      console.warn('[Auth] env.WORKER_API_KEY:', env.WORKER_API_KEY);
      console.warn(
        '[Auth] process.env.WORKER_API_KEY:',
        process.env.WORKER_API_KEY
      );
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
