import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenant';
import { AppError } from './error';
import permissionsService from '../modules/roles/permissions.service';
import logger from '../config/logger';

/**
 * Middleware для проверки прав доступа пользователя
 * @param entity - Сущность (например, 'operations', 'articles', 'users')
 * @param action - Действие (например, 'create', 'read', 'update', 'delete')
 * @returns Express middleware function
 */
export const requirePermission = (entity: string, action: string) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw new AppError('User ID not found in request', 401);
      }

      if (!req.companyId) {
        throw new AppError('Company ID not found in request', 401);
      }

      logger.debug('Checking permission', {
        userId: req.userId,
        companyId: req.companyId,
        entity,
        action,
        path: req.path,
        method: req.method,
      });

      const hasPermission = await permissionsService.checkPermission(
        req.userId,
        req.companyId,
        entity,
        action
      );

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.userId,
          companyId: req.companyId,
          entity,
          action,
          path: req.path,
          method: req.method,
        });
        throw new AppError('У вас нет прав для выполнения этого действия', 403);
      }

      logger.debug('Permission granted', {
        userId: req.userId,
        companyId: req.companyId,
        entity,
        action,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};
