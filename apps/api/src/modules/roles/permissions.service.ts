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
    console.log('[PermissionsService.checkPermission] Начало проверки права', {
      userId,
      companyId,
      entity,
      action,
      inTransaction: !!tx,
    });

    // Используем policy с транзакцией, если передана
    const policy = tx ? new PermissionPolicy(tx) : globalPolicy;

    const result = await policy.check({
      userId,
      companyId,
      entity,
      action,
    });

    console.log('[PermissionsService.checkPermission] Результат проверки', {
      userId,
      companyId,
      entity,
      action,
      allowed: result.allowed,
      reason: result.reason,
      grantedBy: result.grantedBy,
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
    console.log(
      '[PermissionsService.getUserPermissions] Начало получения всех прав пользователя',
      {
        userId,
        companyId,
        inTransaction: !!tx,
      }
    );

    // Используем policy с транзакцией, если передана
    const policy = tx ? new PermissionPolicy(tx) : globalPolicy;

    const permissions = await policy.getAllUserPermissions(userId, companyId);

    console.log(
      '[PermissionsService.getUserPermissions] Права пользователя получены',
      {
        userId,
        companyId,
        entitiesCount: Object.keys(permissions).length,
        permissionsByEntity: Object.entries(permissions).map(
          ([entity, actions]) => ({
            entity,
            actionsCount: actions.length,
            actions,
          })
        ),
      }
    );

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
    console.log(
      '[PermissionsService.hasAnyPermission] Начало проверки хотя бы одного права',
      {
        userId,
        companyId,
        entity,
        actions,
        inTransaction: !!tx,
      }
    );

    for (const action of actions) {
      const hasPermission = await this.checkPermission(
        userId,
        companyId,
        entity,
        action,
        tx
      );
      if (hasPermission) {
        console.log(
          '[PermissionsService.hasAnyPermission] Найдено разрешённое действие',
          {
            userId,
            companyId,
            entity,
            allowedAction: action,
          }
        );
        return true;
      }
    }

    console.log(
      '[PermissionsService.hasAnyPermission] Ни одно из действий не разрешено',
      {
        userId,
        companyId,
        entity,
        actions,
      }
    );

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
    console.log(
      '[PermissionsService.hasAllPermissions] Начало проверки всех прав',
      {
        userId,
        companyId,
        entity,
        actions,
        inTransaction: !!tx,
      }
    );

    for (const action of actions) {
      const hasPermission = await this.checkPermission(
        userId,
        companyId,
        entity,
        action,
        tx
      );
      if (!hasPermission) {
        console.log(
          '[PermissionsService.hasAllPermissions] Не найдено разрешённое действие',
          {
            userId,
            companyId,
            entity,
            missingAction: action,
          }
        );
        return false;
      }
    }

    console.log(
      '[PermissionsService.hasAllPermissions] Все действия разрешены',
      {
        userId,
        companyId,
        entity,
        actions,
      }
    );

    return true;
  }

  /**
   * Получить роли пользователя
   */
  async getUserRoles(userId: string, companyId: string, tx?: PrismaClient) {
    console.log(
      '[PermissionsService.getUserRoles] Начало получения ролей пользователя',
      {
        userId,
        companyId,
        inTransaction: !!tx,
      }
    );

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
      console.log(
        '[PermissionsService.getUserRoles] Пользователь не найден или неактивен',
        {
          userId,
          companyId,
        }
      );
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
            role_permissions: {
              select: {
                entity: true,
                action: true,
                allowed: true,
              },
            },
            _count: {
              select: {
                user_roles: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    console.log(
      '[PermissionsService.getUserRoles] Роли пользователя получены',
      {
        userId,
        companyId,
        isSuperAdmin: user.isSuperAdmin,
        rolesCount: userRoles.length,
        roles: userRoles.map((ur: any) => ({
          roleId: ur.roleId,
          roleName: ur.role.name,
          isSystem: ur.role.isSystem,
          permissionsCount: ur.role.role_permissions?.length || 0,
          assignedAt: ur.assignedAt,
        })),
      }
    );

    return userRoles.map((ur: any) => ({
      id: ur.id,
      roleId: ur.roleId,
      role: {
        ...ur.role,
        permissions: ur.role.role_permissions || [],
      },
      assignedAt: ur.assignedAt,
      assignedBy: ur.assignedBy,
    }));
  }
}

export default new PermissionsService();
