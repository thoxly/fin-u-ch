import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenant';
import { AppError } from './error';
import { getCompanyPlan, enforceUserLimit } from '../utils/subscription';
import logger from '../config/logger';

/**
 * Middleware для проверки лимита пользователей перед созданием/приглашением
 * Используется в endpoints создания пользователей и отправки приглашений
 */
export const checkUserLimit = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Если это запрос от worker, пропускаем проверку лимита
    if (req.isWorker) {
      logger.debug('Worker request, skipping user limit check', {
        path: req.path,
        method: req.method,
      });
      return next();
    }

    if (!req.companyId) {
      throw new AppError('Company ID not found in request', 401);
    }

    logger.debug('Checking user limit', {
      companyId: req.companyId,
      path: req.path,
      method: req.method,
    });

    // Получаем текущий план компании
    const currentPlan = await getCompanyPlan(req.companyId);

    // Проверяем лимит пользователей
    await enforceUserLimit(req.companyId, currentPlan);

    logger.debug('User limit check passed', {
      companyId: req.companyId,
      plan: currentPlan,
    });

    next();
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn('User limit check failed', {
        companyId: req.companyId,
        error: error.message,
        statusCode: error.statusCode,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.error('User limit guard error', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        path: req.path,
        method: req.method,
      });
    }
    next(error);
  }
};
