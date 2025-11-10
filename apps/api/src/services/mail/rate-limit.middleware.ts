import { Request, Response, NextFunction } from 'express';
import redis from '../../config/redis';
import { AppError } from '../../middlewares/error';
import logger from '../../config/logger';

const RATE_LIMIT_REQUESTS = 5; // 5 запросов
const RATE_LIMIT_WINDOW = 3600; // 1 час в секундах

export const emailRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const email = req.body.email;

    if (!email) {
      return next(new AppError('Email is required', 400));
    }

    const key = `rate-limit:email:${email}`;
    const current = await redis.incr(key);

    if (current === 1) {
      // Устанавливаем TTL только при первом запросе
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    if (current > RATE_LIMIT_REQUESTS) {
      logger.warn(`Rate limit exceeded for email: ${email}`);
      return next(
        new AppError('Too many requests. Please try again later.', 429)
      );
    }

    next();
  } catch (error) {
    logger.error('Rate limit middleware error', error);
    // В случае ошибки Redis продолжаем выполнение
    next();
  }
};
