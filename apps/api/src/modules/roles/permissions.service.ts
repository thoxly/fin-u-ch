import prisma from '../../config/db';
import { PrismaClient } from '@prisma/client';
import { PermissionPolicy } from './policy/permission-policy';

export interface UserPermission {
  entity: string;
  action: string;
  allowed: boolean;
}

export interface PermissionsByEntity {
  [entity: string]: string[]; // entity -> массив разрешённых действий
}

// Создаем глобальный инстанс policy для использования без транзакций
const globalPolicy = new PermissionPolicy(prisma);

export class PermissionsService {
  /**
   * Проверка права пользователя на конкретное действие
   * Использует новую систему с автоматическим резолвингом зависимостей
   */
  async checkPermission(
    userId: string,
    companyId: string,
    entity: string,
    action: string,
    tx?: PrismaClient
  ): Promise<boolean> {
    // Используем policy с транзакцией, если передана
    const policy = tx ? new PermissionPolicy(tx) : globalPolicy;

    const result = await policy.check({
      userId,
      companyId,
      entity,
      action,
    });

    return result.allowed;
  }

  /**
   * Получить все права пользователя
   * Использует новую систему с автоматическим резолвингом иерархии и зависимостей
   */
  async getUserPermissions(
    userId: string,
    companyId: string,
    tx?: PrismaClient
  ): Promise<PermissionsByEntity> {
    // Используем policy с транзакцией, если передана
    const policy = tx ? new PermissionPolicy(tx) : globalPolicy;

    const permissions = await policy.getAllUserPermissions(userId, companyId);

    return permissions;
  }

  /**
   * Проверка наличия хотя бы одного из указанных действий
   */
  async hasAnyPermission(
    userId: string,
    companyId: string,
    entity: string,
    actions: string[],
    tx?: PrismaClient
  ): Promise<boolean> {
    for (const action of actions) {
      const hasPermission = await this.checkPermission(
        userId,
        companyId,
        entity,
        action,
        tx
      );
      if (hasPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Проверка наличия всех указанных действий
   */
  async hasAllPermissions(
    userId: string,
    companyId: string,
    entity: string,
    actions: string[],
    tx?: PrismaClient
  ): Promise<boolean> {
    for (const action of actions) {
      const hasPermission = await this.checkPermission(
        userId,
        companyId,
        entity,
        action,
        tx
      );
      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  /**
   * Получить роли пользователя
   */
  async getUserRoles(userId: string, companyId: string, tx?: PrismaClient) {
    const db: any = tx || prisma;

    // Проверка пользователя
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        isSuperAdmin: true,
        isActive: true,
      },
    });

    if (!user || user.companyId !== companyId || !user.isActive) {
      return [];
    }

    const userRoles = await db.userRole.findMany({
      where: {
        userId,
        role: {
          isActive: true,
          deletedAt: null,
          companyId,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              select: {
                entity: true,
                action: true,
                allowed: true,
              },
            },
            _count: {
              select: {
                userRoles: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return userRoles.map((ur: any) => ({
      id: ur.id,
      roleId: ur.roleId,
      role: ur.role,
      assignedAt: ur.assignedAt,
      assignedBy: ur.assignedBy,
    }));
  }
}

export default new PermissionsService();
