import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import rolesService, {
  CreateRoleDTO,
  UpdateRoleDTO,
  PermissionDTO,
} from './roles.service';
import auditLogService from '../audit/audit.service';

export class RolesController {
  /**
   * Получить все роли компании
   * GET /api/roles
   */
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log('[RolesController.getAll] Получение всех ролей компании', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const roles = await rolesService.getAllRoles(req.companyId!);
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получить роль по ID
   * GET /api/roles/:id
   */
  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log('[RolesController.getById] Получение роли по ID', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const role = await rolesService.getRoleById(
        req.params.id,
        req.companyId!
      );
      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Создать новую роль
   * POST /api/roles
   */
  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log('[RolesController.create] Создание новой роли', {
        companyId: req.companyId,
        userId: req.userId,
        data: req.body,
      });

      const data: CreateRoleDTO = req.body;
      const role = await rolesService.createRole(req.companyId!, data);

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
      console.log('[RolesController.update] Обновление роли', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        data: req.body,
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
      console.log('[RolesController.delete] Удаление роли', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Получаем данные перед удалением для логирования
      const oldRole = await rolesService.getRoleById(
        req.params.id,
        req.companyId!
      );

      await rolesService.deleteRole(req.params.id, req.companyId!);

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
      console.log('[RolesController.getPermissions] Получение прав роли', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const permissions = await rolesService.getRolePermissions(
        req.params.id,
        req.companyId!
      );
      res.json(permissions);
    } catch (error) {
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
      console.log('[RolesController.updatePermissions] Обновление прав роли', {
        roleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        permissionsCount: req.body?.permissions?.length || 0,
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
      console.log(
        '[RolesController.getByCategory] Получение ролей по категории',
        {
          category: req.params.category,
          companyId: req.companyId,
          userId: req.userId,
        }
      );

      const roles = await rolesService.getRolesByCategory(
        req.companyId!,
        req.params.category
      );
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }
}

export default new RolesController();
