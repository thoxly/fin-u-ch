import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import usersService from './users.service';
import permissionsService from '../roles/permissions.service';
import auditLogService from '../audit/audit.service';

export class UsersController {
  async getMe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getMe(req.userId!, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.updateMe(
        req.userId!,
        req.companyId!,
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Изменить пароль пользователя
   * POST /api/users/change-password
   */
  async changePassword(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await usersService.changePassword(
        req.userId!,
        req.companyId!,
        currentPassword,
        newPassword
      );
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получить роли пользователя
   * GET /api/users/:id/roles
   */
  async getUserRoles(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log(
        '[UsersController.getUserRoles] Получение ролей пользователя',
        {
          userId: req.params.id,
          companyId: req.companyId,
          requestedBy: req.userId,
        }
      );

      const roles = await usersService.getUserRoles(
        req.params.id,
        req.companyId!
      );
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Назначить роль пользователю
   * POST /api/users/:id/roles
   */
  async assignRole(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log('[UsersController.assignRole] Назначение роли пользователю', {
        userId: req.params.id,
        roleId: req.body.roleId,
        companyId: req.companyId,
        assignedBy: req.userId,
      });

      const { roleId } = req.body;

      if (!roleId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'roleId is required',
        });
      }

      const userRole = await usersService.assignRole(
        req.params.id,
        roleId,
        req.companyId!,
        req.userId!
      );

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'assign_role',
        entity: 'user',
        entityId: req.params.id,
        changes: { new: { roleId, userRoleId: userRole.id } },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          targetUserId: req.params.id,
          roleId,
        },
      });

      res.status(201).json(userRole);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Снять роль с пользователя
   * DELETE /api/users/:id/roles/:roleId
   */
  async removeRole(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log('[UsersController.removeRole] Снятие роли с пользователя', {
        userId: req.params.id,
        roleId: req.params.roleId,
        companyId: req.companyId,
        requestedBy: req.userId,
      });

      const result = await usersService.removeRole(
        req.params.id,
        req.params.roleId,
        req.companyId!
      );

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'remove_role',
        entity: 'user',
        entityId: req.params.id,
        changes: { old: { roleId: req.params.roleId } },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          targetUserId: req.params.id,
          roleId: req.params.roleId,
        },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Обновить пользователя
   * PATCH /api/users/:id
   */
  async updateUser(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log('[UsersController.updateUser] Обновление пользователя', {
        userId: req.params.id,
        companyId: req.companyId,
        updatedBy: req.userId,
        data: req.body,
      });

      // Получаем старую версию для логирования
      const oldUser = await usersService.getAll(req.companyId!);
      const oldUserData = oldUser.find((u) => u.id === req.params.id);

      const result = await usersService.updateUser(
        req.params.id,
        req.companyId!,
        req.body
      );

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'user',
        entityId: result.id,
        changes: { old: oldUserData, new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          targetUserId: req.params.id,
        },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Пригласить пользователя
   * POST /api/users/invite
   */
  async inviteUser(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log('[UsersController.inviteUser] Приглашение пользователя', {
        companyId: req.companyId,
        invitedBy: req.userId,
        data: req.body,
      });

      const { email, roleIds = [] } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'email is required',
        });
      }

      const result = await usersService.inviteUser(
        req.companyId!,
        email,
        roleIds,
        req.userId!
      );

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'user',
        entityId: result.id,
        changes: { new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          invitedBy: req.userId,
          roleIds,
        },
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получить права пользователя
   * GET /api/users/:id/permissions
   */
  async getUserPermissions(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        '[UsersController.getUserPermissions] Получение прав пользователя',
        {
          userId: req.params.id,
          companyId: req.companyId,
          requestedBy: req.userId,
        }
      );

      // Пользователь может получить свои права, или администратор может получить права любого пользователя
      const targetUserId = req.params.id;
      const permissions = await permissionsService.getUserPermissions(
        targetUserId,
        req.companyId!
      );
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Удалить пользователя
   * DELETE /api/users/:id
   */
  async deleteUser(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log('[UsersController.deleteUser] Удаление пользователя', {
        userId: req.params.id,
        companyId: req.companyId,
        deletedBy: req.userId,
      });

      await usersService.deleteUser(req.params.id, req.companyId!, req.userId!);

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'user',
        entityId: req.params.id,
        changes: { old: { id: req.params.id } },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          targetUserId: req.params.id,
        },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Запросить смену email
   * POST /api/users/request-email-change
   */
  async requestEmailChange(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { newEmail } = req.body;
      await usersService.requestEmailChange(
        req.userId!,
        req.companyId!,
        newEmail
      );
      res.json({
        message: 'Verification email sent to your current email address',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Подтвердить старый email для смены
   * POST /api/users/confirm-old-email-change
   */
  async confirmOldEmailForChange(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { token } = req.body;
      await usersService.confirmOldEmailForChange(token, req.companyId!);
      res.json({
        message:
          'Old email confirmed. Verification email sent to new email address',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Подтвердить смену email
   * POST /api/users/confirm-email-change
   */
  async confirmEmailChange(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { token } = req.body;
      await usersService.confirmEmailChangeWithEmail(token, req.companyId!);
      res.json({ message: 'Email changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getPreferences(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getPreferences(
        req.userId!,
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await usersService.updatePreferences(
        req.userId!,
        req.companyId!,
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Удалить свой аккаунт
   * DELETE /api/users/me
   */
  async deleteMyAccount(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      console.log(
        '[UsersController.deleteMyAccount] Удаление своего аккаунта',
        {
          userId: req.userId,
          companyId: req.companyId,
        }
      );

      await usersService.deleteMyAccount(req.userId!, req.companyId!);

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export default new UsersController();
