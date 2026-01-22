import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';
import { AppError } from './error';
import logger from '../config/logger';
import { TenantRequest } from './tenant';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

/**
 * Создает rate limiter middleware с настраиваемыми параметрами
 */
export const createRateLimiter = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : `rate-limit:${req.ip}:${req.path}`;

      const current = await redis.incr(key);

      if (current === 1) {
        // Устанавливаем TTL только при первом запросе
        await redis.expire(key, Math.ceil(config.windowMs / 1000));
      }

      // Устанавливаем заголовки для клиента
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, config.maxRequests - current)
      );
      res.setHeader('X-RateLimit-Reset', Date.now() + config.windowMs);

      if (current > config.maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          current,
          max: config.maxRequests,
          path: req.path,
          method: req.method,
          userId: (req as TenantRequest).user?.id,
          companyId: (req as TenantRequest).companyId,
        });
        return next(
          new AppError(
            config.message || 'Too many requests. Please try again later.',
            429
          )
        );
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', {
        error,
        path: req.path,
        method: req.method,
      });
      // В случае ошибки Redis продолжаем выполнение (fail open)
      next();
    }
  };
};

/**
 * Rate limiter для операций (чтение)
 * 100 запросов в минуту на пользователя
 */
export const operationsRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 100,
  keyGenerator: (req) => {
    const tenantReq = req as TenantRequest;
    const userId = tenantReq.user?.id || 'anonymous';
    return `rate-limit:operations:${userId}`;
  },
  message: 'Too many operation requests. Please try again in a minute.',
});

/**
 * Rate limiter для создания операций
 * 20 запросов в минуту на пользователя
 */
export const createOperationRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 20,
  keyGenerator: (req) => {
    const tenantReq = req as TenantRequest;
    const userId = tenantReq.user?.id || 'anonymous';
    return `rate-limit:operations:create:${userId}`;
  },
  message:
    'Too many operation creation requests. Please try again in a minute.',
});

/**
 * Rate limiter для отчетов
 * 30 запросов в минуту на пользователя
 */
export const reportsRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 30,
  keyGenerator: (req) => {
    const tenantReq = req as TenantRequest;
    const userId = tenantReq.user?.id || 'anonymous';
    return `rate-limit:reports:${userId}`;
  },
  message: 'Too many report requests. Please try again in a minute.',
});

/**
 * Rate limiter для обновления операций
 * 50 запросов в минуту на пользователя
 */
export const updateOperationRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 50,
  keyGenerator: (req) => {
    const tenantReq = req as TenantRequest;
    const userId = tenantReq.user?.id || 'anonymous';
    return `rate-limit:operations:update:${userId}`;
  },
  message: 'Too many operation update requests. Please try again in a minute.',
});

/**
 * Rate limiter для удаления операций
 * 30 запросов в минуту на пользователя
 */
export const deleteOperationRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 30,
  keyGenerator: (req) => {
    const tenantReq = req as TenantRequest;
    const userId = tenantReq.user?.id || 'anonymous';
    return `rate-limit:operations:delete:${userId}`;
  },
  message:
    'Too many operation deletion requests. Please try again in a minute.',
});

/**
 * Общий rate limiter для API
 * 200 запросов в минуту на IP
 */
export const generalApiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 200,
  keyGenerator: (req) => `rate-limit:api:${req.ip}`,
  message: 'Too many API requests. Please try again in a minute.',
});
