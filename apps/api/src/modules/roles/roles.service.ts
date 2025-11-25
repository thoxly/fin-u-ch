import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { validateRequired } from '../../utils/validation';
import { PrismaClient } from '@prisma/client';

export interface CreateRoleDTO {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateRoleDTO {
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface PermissionDTO {
  entity: string;
  action: string;
  allowed: boolean;
}

export class RolesService {
  /**
   * Получить все активные роли компании
   */
  async getAllRoles(companyId: string, tx?: PrismaClient) {
    console.log(
      '[RolesService.getAllRoles] Начало получения всех ролей компании',
      {
        companyId,
        inTransaction: !!tx,
      }
    );

    try {
      const db: any = tx || prisma;
      const roles = await db.role.findMany({
        where: {
          companyId,
          isActive: true,
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              userRoles: true,
            },
          },
          permissions: {
            select: {
              entity: true,
              action: true,
              allowed: true,
            },
          },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      console.log('[RolesService.getAllRoles] Получено ролей', {
        companyId,
        count: roles.length,
        roles: roles.map((r: any) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          usersCount: r._count?.userRoles || 0,
        })),
      });

      return roles;
    } catch (error) {
      console.error('[RolesService.getAllRoles] Ошибка при получении ролей', {
        companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Получить роль по ID
   */
  async getRoleById(roleId: string, companyId: string, tx?: PrismaClient) {
    console.log('[RolesService.getRoleById] Начало получения роли по ID', {
      roleId,
      companyId,
      inTransaction: !!tx,
    });

    const db: any = tx || prisma;
    const role = await db.role.findFirst({
      where: {
        id: roleId,
        companyId,
        deletedAt: null,
      },
      include: {
        permissions: {
          select: {
            id: true,
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
    });

    if (!role) {
      console.log('[RolesService.getRoleById] Роль не найдена', {
        roleId,
        companyId,
      });
      throw new AppError('Role not found', 404);
    }

    console.log('[RolesService.getRoleById] Роль найдена', {
      roleId,
      companyId,
      name: role.name,
      isSystem: role.isSystem,
      permissionsCount: role.permissions.length,
      usersCount: role._count.userRoles,
    });

    return role;
  }

  /**
   * Создать новую роль
   */
  async createRole(companyId: string, data: CreateRoleDTO, tx?: PrismaClient) {
    console.log('[RolesService.createRole] Начало создания роли', {
      companyId,
      name: data.name,
      description: data.description,
      category: data.category,
      inTransaction: !!tx,
    });

    validateRequired({ name: data.name });

    const db: any = tx || prisma;

    // Проверка уникальности названия в рамках компании
    const existingRole = await db.role.findFirst({
      where: {
        companyId,
        name: data.name,
        deletedAt: null,
      },
    });

    if (existingRole) {
      console.log(
        '[RolesService.createRole] Роль с таким названием уже существует',
        {
          companyId,
          name: data.name,
          existingRoleId: existingRole.id,
        }
      );
      throw new AppError('Role with this name already exists', 409);
    }

    const role = await db.role.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        category: data.category,
        isSystem: false,
        isActive: true,
      },
      include: {
        permissions: true,
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    console.log('[RolesService.createRole] Роль успешно создана', {
      roleId: role.id,
      companyId,
      name: role.name,
      category: role.category,
      isSystem: role.isSystem,
    });

    return role;
  }

  /**
   * Обновить роль
   */
  async updateRole(
    roleId: string,
    companyId: string,
    data: UpdateRoleDTO,
    tx?: PrismaClient
  ) {
    console.log('[RolesService.updateRole] Начало обновления роли', {
      roleId,
      companyId,
      updateData: data,
      inTransaction: !!tx,
    });

    const db: any = tx || prisma;
    const role = await this.getRoleById(roleId, companyId, tx);

    if (role.isSystem) {
      console.log('[RolesService.updateRole] Попытка изменить системную роль', {
        roleId,
        companyId,
        name: role.name,
      });
      throw new AppError('Cannot update system role', 403);
    }

    // Проверка уникальности названия, если оно изменяется
    if (data.name && data.name !== role.name) {
      const existingRole = await db.role.findFirst({
        where: {
          companyId,
          name: data.name,
          deletedAt: null,
          id: { not: roleId },
        },
      });

      if (existingRole) {
        console.log(
          '[RolesService.updateRole] Роль с таким названием уже существует',
          {
            companyId,
            name: data.name,
            existingRoleId: existingRole.id,
          }
        );
        throw new AppError('Role with this name already exists', 409);
      }
    }

    const updatedRole = await db.role.update({
      where: { id: roleId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        permissions: true,
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    console.log('[RolesService.updateRole] Роль успешно обновлена', {
      roleId,
      companyId,
      name: updatedRole.name,
      isActive: updatedRole.isActive,
      changes: {
        name:
          data.name !== undefined
            ? { old: role.name, new: updatedRole.name }
            : undefined,
        isActive:
          data.isActive !== undefined
            ? { old: role.isActive, new: updatedRole.isActive }
            : undefined,
      },
    });

    return updatedRole;
  }

  /**
   * Удалить роль (soft delete)
   */
  async deleteRole(roleId: string, companyId: string, tx?: PrismaClient) {
    console.log('[RolesService.deleteRole] Начало удаления роли', {
      roleId,
      companyId,
      inTransaction: !!tx,
    });

    const db: any = tx || prisma;
    const role = await this.getRoleById(roleId, companyId, tx);

    if (role.isSystem) {
      console.log('[RolesService.deleteRole] Попытка удалить системную роль', {
        roleId,
        companyId,
        name: role.name,
      });
      throw new AppError('Cannot delete system role', 403);
    }

    // Проверка использования роли
    const usersWithRole = await db.userRole.count({
      where: {
        roleId,
      },
    });

    if (usersWithRole > 0) {
      console.log(
        '[RolesService.deleteRole] Роль используется пользователями',
        {
          roleId,
          companyId,
          usersCount: usersWithRole,
        }
      );
      throw new AppError(
        `Cannot delete role: it is assigned to ${usersWithRole} user(s)`,
        409
      );
    }

    const deletedRole = await db.role.update({
      where: { id: roleId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    console.log('[RolesService.deleteRole] Роль успешно удалена', {
      roleId,
      companyId,
      name: deletedRole.name,
      deletedAt: deletedRole.deletedAt,
    });

    return deletedRole;
  }

  /**
   * Получить права роли
   */
  async getRolePermissions(
    roleId: string,
    companyId: string,
    tx?: PrismaClient
  ) {
    console.log(
      '[RolesService.getRolePermissions] Начало получения прав роли',
      {
        roleId,
        companyId,
        inTransaction: !!tx,
      }
    );

    const db: any = tx || prisma;
    const role = await this.getRoleById(roleId, companyId, tx);

    const permissions = await db.rolePermission.findMany({
      where: {
        roleId,
      },
      orderBy: [{ entity: 'asc' }, { action: 'asc' }],
    });

    // Группировка по сущностям
    const groupedPermissions = permissions.reduce(
      (acc: Record<string, Record<string, boolean>>, perm: any) => {
        if (!acc[perm.entity]) {
          acc[perm.entity] = {};
        }
        acc[perm.entity][perm.action] = perm.allowed;
        return acc;
      },
      {} as Record<string, Record<string, boolean>>
    );

    console.log('[RolesService.getRolePermissions] Права роли получены', {
      roleId,
      companyId,
      roleName: role.name,
      permissionsCount: permissions.length,
      entities: Object.keys(groupedPermissions),
      groupedPermissions,
    });

    return {
      roleId,
      roleName: role.name,
      permissions: groupedPermissions,
      rawPermissions: permissions,
    };
  }

  /**
   * Обновить права роли
   */
  async updateRolePermissions(
    roleId: string,
    companyId: string,
    permissions: PermissionDTO[],
    tx?: PrismaClient
  ) {
    console.log(
      '[RolesService.updateRolePermissions] Начало обновления прав роли',
      {
        roleId,
        companyId,
        permissionsCount: permissions.length,
        permissions,
        inTransaction: !!tx,
      }
    );

    const db: any = tx || prisma;
    const role = await this.getRoleById(roleId, companyId, tx);

    if (role.isSystem) {
      console.log(
        '[RolesService.updateRolePermissions] Попытка изменить права системной роли',
        {
          roleId,
          companyId,
          name: role.name,
        }
      );
      throw new AppError('Cannot update permissions of system role', 403);
    }

    // Получаем текущие права для сравнения
    const currentPermissions = await db.rolePermission.findMany({
      where: { roleId },
    });

    console.log('[RolesService.updateRolePermissions] Текущие права роли', {
      roleId,
      currentPermissionsCount: currentPermissions.length,
      currentPermissions: currentPermissions.map((p: any) => ({
        entity: p.entity,
        action: p.action,
        allowed: p.allowed,
      })),
    });

    // Выполняем обновление в транзакции (если не передана внешняя транзакция)
    if (tx) {
      // Используем переданную транзакцию
      const result = await this.updateRolePermissionsInternal(
        roleId,
        permissions,
        currentPermissions,
        tx
      );
      console.log(
        '[RolesService.updateRolePermissions] Права роли успешно обновлены (в транзакции)',
        {
          roleId,
          companyId,
          roleName: role.name,
          oldPermissionsCount: currentPermissions.length,
          newPermissionsCount: result.length,
        }
      );
      return result;
    } else {
      // Создаём свою транзакцию
      const result = await db.$transaction(async (txInner: any) => {
        return await this.updateRolePermissionsInternal(
          roleId,
          permissions,
          currentPermissions,
          txInner as PrismaClient
        );
      });

      console.log(
        '[RolesService.updateRolePermissions] Права роли успешно обновлены',
        {
          roleId,
          companyId,
          roleName: role.name,
          oldPermissionsCount: currentPermissions.length,
          newPermissionsCount: result.length,
          changes: {
            removed: currentPermissions.filter(
              (cp: any) =>
                !result.some(
                  (np: any) =>
                    np.entity === cp.entity && np.action === cp.action
                )
            ).length,
            added: result.filter(
              (np: any) =>
                !currentPermissions.some(
                  (cp: any) =>
                    cp.entity === np.entity && cp.action === np.action
                )
            ).length,
          },
        }
      );

      return result;
    }
  }

  /**
   * Внутренний метод для обновления прав (используется в транзакции)
   */
  private async updateRolePermissionsInternal(
    roleId: string,
    permissions: PermissionDTO[],
    currentPermissions: any[],
    tx: PrismaClient
  ) {
    // Удаляем все существующие права
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    console.log('[RolesService.updateRolePermissions] Старые права удалены', {
      roleId,
      deletedCount: currentPermissions.length,
    });

    // Создаём новые права (только те, где allowed = true)
    const permissionsToCreate = permissions.filter((p) => p.allowed);

    if (permissionsToCreate.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionsToCreate.map((p) => ({
          roleId,
          entity: p.entity,
          action: p.action,
          allowed: true,
        })),
      });

      console.log('[RolesService.updateRolePermissions] Новые права созданы', {
        roleId,
        createdCount: permissionsToCreate.length,
      });
    }

    // Возвращаем обновлённые права
    return await tx.rolePermission.findMany({
      where: { roleId },
      orderBy: [{ entity: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Получить роли по категории
   */
  async getRolesByCategory(
    companyId: string,
    category?: string,
    tx?: PrismaClient
  ) {
    console.log(
      '[RolesService.getRolesByCategory] Начало получения ролей по категории',
      {
        companyId,
        category,
        inTransaction: !!tx,
      }
    );

    const db: any = tx || prisma;
    const where: any = {
      companyId,
      isActive: true,
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    const roles = await db.role.findMany({
      where,
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Группировка по категориям
    const groupedRoles = roles.reduce(
      (acc: Record<string, any[]>, role: any) => {
        const cat = role.category || 'Без категории';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(role);
        return acc;
      },
      {} as Record<string, typeof roles>
    );

    console.log(
      '[RolesService.getRolesByCategory] Роли по категориям получены',
      {
        companyId,
        category,
        totalRoles: roles.length,
        categories: Object.keys(groupedRoles),
        rolesByCategory: Object.entries(groupedRoles).map(
          ([cat, rolesList]: any) => ({
            category: cat,
            count: rolesList.length,
          })
        ),
      }
    );

    return {
      roles,
      groupedByCategory: groupedRoles,
    };
  }
}

export default new RolesService();
