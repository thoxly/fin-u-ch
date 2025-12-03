import { PrismaClient } from '@prisma/client';
import { ENTITIES_CONFIG } from '../config/entities.config';
import { includesAction } from '../config/action-hierarchy';
import { Action, PermissionCheck, PermissionCheckResult } from '../types';

/**
 * Политика проверки прав доступа с автоматическим резолвингом зависимостей
 *
 * Логика проверки:
 * 1. Проверка пользователя и статуса супер-админа
 * 2. Проверка прямого права в базе данных
 * 3. Проверка по иерархии действий (delete → update → read)
 * 4. Проверка зависимостей между сущностями (operations требует read на справочники)
 */
export class PermissionPolicy {
  constructor(private db: PrismaClient) {}

  /**
   * Главный метод проверки прав с автоматическим резолвингом
   *
   * @param params Параметры проверки (userId, companyId, entity, action)
   * @returns Результат проверки с причиной и способом получения права
   */
  async check(params: PermissionCheck): Promise<PermissionCheckResult> {
    const { userId, companyId, entity, action } = params;

    // 1. Проверка пользователя и супер-администратора
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        isSuperAdmin: true,
        isActive: true,
      },
    });

    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
      };
    }

    if (user.companyId !== companyId) {
      return {
        allowed: false,
        reason: 'User does not belong to company',
      };
    }

    if (!user.isActive) {
      return {
        allowed: false,
        reason: 'User is inactive',
      };
    }

    if (user.isSuperAdmin) {
      return {
        allowed: true,
        reason: 'User is super admin',
        grantedBy: 'direct',
      };
    }

    // 2. Проверка прямого права
    const directPermission = await this.checkDirectPermission(
      userId,
      companyId,
      entity,
      action
    );
    if (directPermission) {
      return {
        allowed: true,
        reason: `Direct permission: ${entity}:${action}`,
        grantedBy: 'direct',
      };
    }

    // 3. Проверка по иерархии действий
    // Если есть право на более высокое действие (например, delete), то есть и на низкие (update, read)
    const hierarchyPermission = await this.checkHierarchyPermission(
      userId,
      companyId,
      entity,
      action
    );
    if (hierarchyPermission) {
      return {
        allowed: true,
        reason: `Permission granted by action hierarchy: ${entity}:${action}`,
        grantedBy: 'hierarchy',
      };
    }

    // 4. Проверка зависимостей между сущностями
    // Если это read на справочник, проверяем, есть ли права на сущности, которые его требуют
    if (action === 'read') {
      const dependencyPermission = await this.checkDependencyPermission(
        userId,
        companyId,
        entity
      );
      if (dependencyPermission.allowed) {
        return {
          allowed: true,
          reason: `Read access granted by dependency: ${dependencyPermission.dependentEntity} requires ${entity}`,
          grantedBy: 'dependency',
        };
      }
    }

    return {
      allowed: false,
      reason: `No permission found for ${entity}:${action}`,
    };
  }

  /**
   * Проверка прямого права в базе данных
   *
   * @param userId ID пользователя
   * @param companyId ID компании
   * @param entity Имя сущности
   * @param action Действие
   * @returns true, если есть прямое право
   */
  private async checkDirectPermission(
    userId: string,
    companyId: string,
    entity: string,
    action: string
  ): Promise<boolean> {
    const userRoles = await this.db.userRole.findMany({
      where: {
        userId,
        role: {
          isActive: true,
          deletedAt: null,
          companyId,
        },
      },
      select: { roleId: true },
    });

    if (userRoles.length === 0) return false;

    const roleIds = userRoles.map((ur) => ur.roleId);
    const permission = await this.db.rolePermission.findFirst({
      where: {
        roleId: { in: roleIds },
        entity: entity,
        action: action,
        allowed: true,
      },
    });

    return !!permission;
  }

  /**
   * Проверка по иерархии действий
   *
   * Если есть право на высокое действие (например, delete), проверяем низкое (read)
   *
   * @param userId ID пользователя
   * @param companyId ID компании
   * @param entity Имя сущности
   * @param action Запрашиваемое действие
   * @returns true, если есть более высокое право, включающее запрашиваемое
   */
  private async checkHierarchyPermission(
    userId: string,
    companyId: string,
    entity: string,
    action: string
  ): Promise<boolean> {
    const userRoles = await this.db.userRole.findMany({
      where: {
        userId,
        role: {
          isActive: true,
          deletedAt: null,
          companyId,
        },
      },
      select: { roleId: true },
    });

    if (userRoles.length === 0) return false;

    const roleIds = userRoles.map((ur) => ur.roleId);

    // Получаем все права пользователя на эту сущность
    const permissions = await this.db.rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
        entity: entity,
        allowed: true,
      },
      select: { action: true },
    });

    // Проверяем, есть ли у пользователя более высокое право, которое включает запрашиваемое
    for (const perm of permissions) {
      if (includesAction(perm.action as Action, action as Action)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Проверка зависимостей между сущностями
   *
   * Если запрашивается read на справочник, проверяем, есть ли права на сущности,
   * которые требуют доступа к этому справочнику
   *
   * Например:
   * - Если есть operations:create, автоматически дается read на articles, accounts, etc.
   * - Если есть budgets:update, автоматически дается read на articles, departments
   * - Если есть articles:update, автоматически дается read на counterparties
   *
   * @param userId ID пользователя
   * @param companyId ID компании
   * @param targetEntity Сущность, для которой проверяется read доступ
   * @returns Информация о разрешении и зависимости
   */
  private async checkDependencyPermission(
    userId: string,
    companyId: string,
    targetEntity: string
  ): Promise<{ allowed: boolean; dependentEntity?: string }> {
    // Находим все сущности, которые требуют доступа к targetEntity
    const dependentEntities = Object.values(ENTITIES_CONFIG).filter((config) =>
      config.requiresReadAccess?.includes(targetEntity)
    );

    if (dependentEntities.length === 0) {
      return { allowed: false };
    }

    // Проверяем, есть ли у пользователя хотя бы одно активное право
    // на эти зависимые сущности (любое действие, кроме read)
    for (const depEntity of dependentEntities) {
      // Получаем все действия сущности, кроме read
      const activeActions = depEntity.actions.filter(
        (action) => action !== 'read'
      );

      const hasActivePermission = await this.hasAnyActivePermission(
        userId,
        companyId,
        depEntity.name,
        activeActions
      );

      if (hasActivePermission) {
        return {
          allowed: true,
          dependentEntity: depEntity.name,
        };
      }
    }

    return { allowed: false };
  }

  /**
   * Проверка наличия хотя бы одного из указанных действий
   *
   * @param userId ID пользователя
   * @param companyId ID компании
   * @param entity Имя сущности
   * @param actions Список действий для проверки
   * @returns true, если есть хотя бы одно из действий
   */
  private async hasAnyActivePermission(
    userId: string,
    companyId: string,
    entity: string,
    actions: string[]
  ): Promise<boolean> {
    const userRoles = await this.db.userRole.findMany({
      where: {
        userId,
        role: {
          isActive: true,
          deletedAt: null,
          companyId,
        },
      },
      select: { roleId: true },
    });

    if (userRoles.length === 0) return false;

    const roleIds = userRoles.map((ur) => ur.roleId);

    const permission = await this.db.rolePermission.findFirst({
      where: {
        roleId: { in: roleIds },
        entity: entity,
        action: { in: actions },
        allowed: true,
      },
    });

    return !!permission;
  }

  /**
   * Получить все права пользователя (с учетом иерархии и зависимостей)
   *
   * Этот метод вычисляет полный набор прав пользователя, включая:
   * - Прямые права из ролей
   * - Права, полученные через иерархию действий
   * - Права, полученные через зависимости сущностей
   *
   * @param userId ID пользователя
   * @param companyId ID компании
   * @returns Объект с правами по сущностям: { entityName: ['action1', 'action2'] }
   */
  async getAllUserPermissions(
    userId: string,
    companyId: string
  ): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};

    // Для каждой сущности проверяем все её действия
    for (const [entityName, entityConfig] of Object.entries(ENTITIES_CONFIG)) {
      result[entityName] = [];

      for (const action of entityConfig.actions) {
        const check = await this.check({
          userId,
          companyId,
          entity: entityName,
          action: action,
        });

        if (check.allowed) {
          result[entityName].push(action);
        }
      }
    }

    return result;
  }
}
