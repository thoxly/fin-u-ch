import prisma from '../../config/db';
import { PrismaClient } from '@prisma/client';

export interface UserPermission {
  entity: string;
  action: string;
  allowed: boolean;
}

export interface PermissionsByEntity {
  [entity: string]: string[]; // entity -> массив разрешённых действий
}

export class PermissionsService {
  /**
   * Проверка права пользователя на конкретное действие
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

    const db: any = tx || prisma;

    // 1. Проверка супер-администратора
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        isSuperAdmin: true,
        isActive: true,
      },
    });

    if (!user) {
      console.log(
        '[PermissionsService.checkPermission] Пользователь не найден',
        {
          userId,
          companyId,
        }
      );
      return false;
    }

    if (user.companyId !== companyId) {
      console.log(
        '[PermissionsService.checkPermission] Пользователь не принадлежит компании',
        {
          userId,
          userCompanyId: user.companyId,
          requestedCompanyId: companyId,
        }
      );
      return false;
    }

    if (!user.isActive) {
      console.log(
        '[PermissionsService.checkPermission] Пользователь неактивен',
        {
          userId,
          companyId,
        }
      );
      return false;
    }

    if (user.isSuperAdmin) {
      console.log(
        '[PermissionsService.checkPermission] Пользователь является супер-администратором - доступ разрешён',
        {
          userId,
          companyId,
          entity,
          action,
        }
      );
      return true;
    }

    // 2. Получение ролей пользователя
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
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    console.log(
      '[PermissionsService.checkPermission] Роли пользователя получены',
      {
        userId,
        companyId,
        rolesCount: userRoles.length,
        roles: userRoles.map((ur: any) => ({
          roleId: ur.roleId,
          roleName: ur.role.name,
        })),
      }
    );

    if (userRoles.length === 0) {
      console.log(
        '[PermissionsService.checkPermission] У пользователя нет ролей - доступ запрещён',
        {
          userId,
          companyId,
          entity,
          action,
        }
      );
      return false;
    }

    // 3. Получение прав из ролей
    const roleIds = userRoles.map((ur: any) => ur.roleId);
    const permissions = await db.rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
        entity,
        action,
        allowed: true,
      },
    });

    console.log(
      '[PermissionsService.checkPermission] Права из ролей получены',
      {
        userId,
        companyId,
        entity,
        action,
        roleIds,
        permissionsCount: permissions.length,
        permissions: permissions.map((p: any) => ({
          roleId: p.roleId,
          entity: p.entity,
          action: p.action,
        })),
      }
    );

    const hasPermission = permissions.length > 0;

    console.log(
      '[PermissionsService.checkPermission] Результат проверки права',
      {
        userId,
        companyId,
        entity,
        action,
        hasPermission,
      }
    );

    return hasPermission;
  }

  /**
   * Получить все права пользователя
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

    const db: any = tx || prisma;

    // 1. Проверка супер-администратора
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
        '[PermissionsService.getUserPermissions] Пользователь не найден или неактивен',
        {
          userId,
          companyId,
          userFound: !!user,
          userCompanyId: user?.companyId,
          userIsActive: user?.isActive,
        }
      );
      return {};
    }

    if (user.isSuperAdmin) {
      console.log(
        '[PermissionsService.getUserPermissions] Пользователь является супер-администратором - возвращаем все права',
        {
          userId,
          companyId,
        }
      );

      // Для супер-админа возвращаем все возможные права
      // Это упрощённая версия - в реальности можно получить список всех сущностей из схемы
      const allEntities = [
        'dashboard',
        'articles',
        'accounts',
        'departments',
        'counterparties',
        'deals',
        'salaries',
        'operations',
        'budgets',
        'reports',
        'users',
        'audit',
      ];
      const allActions = [
        'create',
        'read',
        'update',
        'delete',
        'archive',
        'restore',
        'confirm',
        'cancel',
        'export',
        'manage_roles',
      ];

      const superAdminPermissions: PermissionsByEntity = {};
      for (const entity of allEntities) {
        superAdminPermissions[entity] = allActions;
      }

      console.log(
        '[PermissionsService.getUserPermissions] Все права для супер-администратора',
        {
          userId,
          companyId,
          entitiesCount: Object.keys(superAdminPermissions).length,
          totalPermissions: Object.values(superAdminPermissions).reduce(
            (sum, actions) => sum + actions.length,
            0
          ),
        }
      );

      return superAdminPermissions;
    }

    // 2. Получение ролей пользователя
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
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(
      '[PermissionsService.getUserPermissions] Роли пользователя получены',
      {
        userId,
        companyId,
        rolesCount: userRoles.length,
        roles: userRoles.map((ur: any) => ({
          roleId: ur.roleId,
          roleName: ur.role.name,
        })),
      }
    );

    if (userRoles.length === 0) {
      console.log(
        '[PermissionsService.getUserPermissions] У пользователя нет ролей - возвращаем пустые права',
        {
          userId,
          companyId,
        }
      );
      return {};
    }

    // 3. Получение всех прав из ролей
    const roleIds = userRoles.map((ur: any) => ur.roleId);
    const permissions = await db.rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
        allowed: true,
      },
      orderBy: [{ entity: 'asc' }, { action: 'asc' }],
    });

    console.log(
      '[PermissionsService.getUserPermissions] Права из ролей получены',
      {
        userId,
        companyId,
        roleIds,
        permissionsCount: permissions.length,
      }
    );

    // 4. Агрегация прав по сущностям
    const permissionsByEntity: PermissionsByEntity = {};
    for (const perm of permissions) {
      if (!permissionsByEntity[perm.entity]) {
        permissionsByEntity[perm.entity] = [];
      }
      if (!permissionsByEntity[perm.entity].includes(perm.action)) {
        permissionsByEntity[perm.entity].push(perm.action);
      }
    }

    console.log(
      '[PermissionsService.getUserPermissions] Права сгруппированы по сущностям',
      {
        userId,
        companyId,
        entitiesCount: Object.keys(permissionsByEntity).length,
        permissionsByEntity: Object.entries(permissionsByEntity).map(
          ([entity, actions]) => ({
            entity,
            actionsCount: actions.length,
            actions,
          })
        ),
      }
    );

    return permissionsByEntity;
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
          permissionsCount: ur.role.permissions.length,
          assignedAt: ur.assignedAt,
        })),
      }
    );

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
