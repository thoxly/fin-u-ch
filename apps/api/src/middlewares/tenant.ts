import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './error';
import prisma from '../config/db';

export interface TenantRequest extends AuthRequest {
  companyId?: string;
  isWorker?: boolean;
}

export const extractTenant = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      throw new AppError('User ID not found in request', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { companyId: true, isActive: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isActive) {
      throw new AppError('User account is inactive', 403);
    }

    // Проверяем, что компания не удалена (soft delete)
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { deletedAt: true },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (company.deletedAt) {
      throw new AppError('Company has been deleted', 403);
    }

    req.companyId = user.companyId;
    next();
  } catch (error) {
    next(error);
  }
};
