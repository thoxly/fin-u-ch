import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './error';
import prisma from '../config/db';

export interface TenantRequest extends AuthRequest {
  companyId?: string;
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

    req.companyId = user.companyId;
    next();
  } catch (error) {
    next(error);
  }
};

