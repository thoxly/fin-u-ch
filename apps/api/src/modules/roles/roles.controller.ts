import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import rolesService, {
  CreateRoleDTO,
  UpdateRoleDTO,
  PermissionDTO,
} from './roles.service';
import auditLogService from '../audit/audit.service';
import logger from '../../config/logger';

export class RolesController {
  /**
   * Получить все роли компании
   * GET /api/roles
   */
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all roles request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const roles = await rolesService.getAllRoles(req.companyId!);

      logger.debug('Roles retrieved successfully', {
        companyId: req.companyId,
        rolesCount: roles.length,
      });

      res.json(roles);
    } catch (error) {
      logger.error('Failed to get roles', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * Получить роль по ID
   * GET /api/roles/:id
   */
  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get role by ID request', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const role = await rolesService.getRoleById(
        req.params.id,
        req.companyId!
      );

      logger.debug('Role retrieved successfully', {
        roleId: req.params.id,
        companyId: req.companyId,
      });

      res.json(role);
    } catch (error) {
      logger.error('Failed to get role', {
        roleId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * Создать новую роль
   * POST /api/roles
   */
  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create role request', {
        companyId: req.companyId,
        userId: req.userId,
        roleName: req.body.name,
        ip: req.ip,
      });

      const data: CreateRoleDTO = req.body;
      const role = await rolesService.createRole(req.companyId!, data);

      logger.info('Role created successfully', {
        roleId: role.id,
        roleName: role.name,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'role',
        entityId: role.id,
        changes: { new: role },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(201).json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Обновить роль
   * PUT /api/roles/:id
   */
  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Update role request', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем старую версию для логирования
      const oldRole = await rolesService.getRoleById(
        req.params.id,
        req.companyId!
      );

      const data: UpdateRoleDTO = req.body;
      const role = await rolesService.updateRole(
        req.params.id,
        req.companyId!,
        data
      );

      logger.info('Role updated successfully', {
        roleId: role.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'role',
        entityId: role.id,
        changes: { old: oldRole, new: role },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Удалить роль (soft delete)
   * DELETE /api/roles/:id
   */
  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Delete role request', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем данные перед удалением для логирования
      const oldRole = await rolesService.getRoleById(
        req.params.id,
        req.companyId!
      );

      await rolesService.deleteRole(req.params.id, req.companyId!);

      logger.info('Role deleted successfully', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'role',
        entityId: req.params.id,
        changes: { old: oldRole },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получить права роли
   * GET /api/roles/:id/permissions
   */
  async getPermissions(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get role permissions request', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const permissions = await rolesService.getRolePermissions(
        req.params.id,
        req.companyId!
      );

      logger.debug('Role permissions retrieved successfully', {
        roleId: req.params.id,
        permissionsCount: permissions.rawPermissions.length,
      });

      res.json(permissions);
    } catch (error) {
      logger.error('Failed to get role permissions', {
        roleId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * Обновить права роли
   * PUT /api/roles/:id/permissions
   */
  async updatePermissions(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.info('Update role permissions request', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        permissionsCount: req.body?.permissions?.length || 0,
        ip: req.ip,
      });

      // Получаем старые права для логирования
      const oldPermissions = await rolesService.getRolePermissions(
        req.params.id,
        req.companyId!
      );

      const permissions: PermissionDTO[] = req.body.permissions || [];
      const result = await rolesService.updateRolePermissions(
        req.params.id,
        req.companyId!,
        permissions
      );

      logger.info('Role permissions updated successfully', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        permissionsCount: result.length,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update_permissions',
        entity: 'role',
        entityId: req.params.id,
        changes: { old: oldPermissions, new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получить роли по категории
   * GET /api/roles/category/:category
   */
  async getByCategory(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get roles by category request', {
        category: req.params.category,
        companyId: req.companyId,
        userId: req.userId,
      });

      const roles = await rolesService.getRolesByCategory(
        req.companyId!,
        req.params.category
      );

      logger.debug('Roles by category retrieved successfully', {
        category: req.params.category,
        companyId: req.companyId,
        rolesCount: roles.roles.length,
      });

      res.json(roles);
    } catch (error) {
      logger.error('Failed to get roles by category', {
        category: req.params.category,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
}

export default new RolesController();
