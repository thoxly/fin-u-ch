import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './error';
import prisma from '../config/db';
import logger from '../config/logger';

export interface TenantRequest extends AuthRequest {
  companyId?: string;
}

export const extractTenant = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Если это запрос от worker, пропускаем извлечение tenant
    if (req.isWorker) {
      logger.debug('Worker request, skipping tenant extraction', {
        path: req.path,
        method: req.method,
      });
      return next();
    }

    if (!req.userId) {
      logger.warn('Tenant extraction failed: User ID not found', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      throw new AppError('User ID not found in request', 401);
    }

    logger.debug('Extracting tenant for user', {
      userId: req.userId,
      path: req.path,
      method: req.method,
    });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { companyId: true, isActive: true },
    });

    if (!user) {
      logger.warn('Tenant extraction failed: User not found', {
        userId: req.userId,
        path: req.path,
        method: req.method,
      });
      throw new AppError('User not found', 404);
    }

    if (!user.isActive) {
      logger.warn('Tenant extraction failed: User account inactive', {
        userId: req.userId,
        companyId: user.companyId,
        path: req.path,
        method: req.method,
      });
      throw new AppError('User account is inactive', 403);
    }

    req.companyId = user.companyId;

    logger.debug('Tenant extracted successfully', {
      userId: req.userId,
      companyId: user.companyId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Tenant extraction error', {
      userId: req.userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path: req.path,
      method: req.method,
    });
    next(error);
  }
};
