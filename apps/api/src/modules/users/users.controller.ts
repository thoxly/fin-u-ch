import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import usersService from './users.service';
import permissionsService from '../roles/permissions.service';
import auditLogService from '../audit/audit.service';
import logger from '../../config/logger';

export class UsersController {
  async getMe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get current user request', {
        userId: req.userId,
        companyId: req.companyId,
      });

      const result = await usersService.getMe(req.userId!, req.companyId!);
      res.json(result);
    } catch (error) {
      logger.error('Failed to get current user', {
        userId: req.userId,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all users request', {
        companyId: req.companyId,
        requestedBy: req.userId,
      });

      const result = await usersService.getAll(req.companyId!);

      logger.debug('Users retrieved successfully', {
        companyId: req.companyId,
        usersCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get users', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async updateMe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Update current user request', {
        userId: req.userId,
        companyId: req.companyId,
        ip: req.ip,
      });

      const result = await usersService.updateMe(
        req.userId!,
        req.companyId!,
        req.body
      );

      logger.info('Current user updated successfully', {
        userId: req.userId,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to update current user', {
        userId: req.userId,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async deleteMe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.warn('Delete current user account request', {
        userId: req.userId,
        companyId: req.companyId,
        ip: req.ip,
      });

      await usersService.deleteMyAccount(req.userId!, req.companyId!);

      logger.warn('Current user account deleted successfully', {
        userId: req.userId,
        companyId: req.companyId,
      });

      res.status(200).json({ success: true, message: 'Account deleted' });
    } catch (error) {
      logger.error('Failed to delete current user account', {
        userId: req.userId,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }

  /**
   * Изменить пароль пользователя
   * POST /api/users/change-password
   */
  async changePassword(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Change password request', {
        userId: req.userId,
        companyId: req.companyId,
        ip: req.ip,
      });

      const { currentPassword, newPassword } = req.body;
      await usersService.changePassword(
        req.userId!,
        req.companyId!,
        currentPassword,
        newPassword
      );

      logger.info('Password changed successfully', {
        userId: req.userId,
        companyId: req.companyId,
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Failed to change password', {
        userId: req.userId,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Получить роли пользователя
   * GET /api/users/:id/roles
   */
  async getUserRoles(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Get user roles request', {
        userId: req.params.id,
        companyId: req.companyId,
        requestedBy: req.userId,
        ip: req.ip,
      });

      const roles = await usersService.getUserRoles(
        req.params.id,
        req.companyId!
      );

      logger.debug('User roles retrieved successfully', {
        userId: req.params.id,
        companyId: req.companyId,
        rolesCount: roles.length,
      });

      res.json(roles);
    } catch (error) {
      logger.error('Failed to get user roles', {
        userId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * Назначить роль пользователю
   * POST /api/users/:id/roles
   */
  async assignRole(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Assign role to user request', {
        userId: req.params.id,
        roleId: req.body.roleId,
        companyId: req.companyId,
        assignedBy: req.userId,
        ip: req.ip,
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

      logger.info('Role assigned to user successfully', {
        userId: req.params.id,
        roleId,
        userRoleId: userRole.id,
        companyId: req.companyId,
        assignedBy: req.userId,
      });

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
      logger.info('Remove role from user request', {
        userId: req.params.id,
        roleId: req.params.roleId,
        companyId: req.companyId,
        requestedBy: req.userId,
        ip: req.ip,
      });

      const result = await usersService.removeRole(
        req.params.id,
        req.params.roleId,
        req.companyId!
      );

      logger.info('Role removed from user successfully', {
        userId: req.params.id,
        roleId: req.params.roleId,
        companyId: req.companyId,
        removedBy: req.userId,
      });

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
      logger.info('Update user request', {
        userId: req.params.id,
        companyId: req.companyId,
        updatedBy: req.userId,
        ip: req.ip,
      });

      // Получаем старую версию для логирования
      const oldUser = await usersService.getAll(req.companyId!);
      const oldUserData = oldUser.find((u) => u.id === req.params.id);

      const result = await usersService.updateUser(
        req.params.id,
        req.companyId!,
        req.body
      );

      logger.info('User updated successfully', {
        userId: req.params.id,
        companyId: req.companyId,
        updatedBy: req.userId,
      });

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
      logger.info('Invite user request', {
        companyId: req.companyId,
        invitedBy: req.userId,
        email: req.body.email,
        roleIds: req.body.roleIds,
        ip: req.ip,
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

      logger.info('User invited successfully', {
        userId: result.id,
        email: result.email,
        companyId: req.companyId,
        invitedBy: req.userId,
      });

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
      logger.info('Get user permissions request', {
        userId: req.params.id,
        companyId: req.companyId,
        requestedBy: req.userId,
        ip: req.ip,
      });

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
      logger.info('Delete user request', {
        userId: req.params.id,
        companyId: req.companyId,
        deletedBy: req.userId,
        ip: req.ip,
      });

      await usersService.deleteUser(req.params.id, req.companyId!, req.userId!);

      logger.info('User deleted successfully', {
        userId: req.params.id,
        companyId: req.companyId,
        deletedBy: req.userId,
      });

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
      logger.info('Request email change', {
        userId: req.userId,
        companyId: req.companyId,
        newEmail: req.body.newEmail,
        ip: req.ip,
      });

      const { newEmail } = req.body;
      await usersService.requestEmailChange(
        req.userId!,
        req.companyId!,
        newEmail
      );

      logger.info('Email change request sent', {
        userId: req.userId,
        companyId: req.companyId,
        newEmail,
      });

      res.json({
        message: 'Verification email sent to your current email address',
      });
    } catch (error) {
      logger.error('Failed to request email change', {
        userId: req.userId,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
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
      logger.info('Confirm old email for change', {
        companyId: req.companyId,
        ip: req.ip,
      });

      const { token } = req.body;
      await usersService.confirmOldEmailForChange(token, req.companyId!);

      logger.info('Old email confirmed for change', {
        companyId: req.companyId,
      });

      res.json({
        message:
          'Old email confirmed. Verification email sent to new email address',
      });
    } catch (error) {
      logger.error('Failed to confirm old email for change', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
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
      logger.info('Confirm email change', {
        companyId: req.companyId,
        ip: req.ip,
      });

      const { token } = req.body;
      await usersService.confirmEmailChangeWithEmail(token, req.companyId!);

      logger.info('Email changed successfully', {
        companyId: req.companyId,
      });

      res.json({ message: 'Email changed successfully' });
    } catch (error) {
      logger.error('Failed to confirm email change', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getPreferences(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get user preferences request', {
        userId: req.userId,
        companyId: req.companyId,
      });

      const result = await usersService.getPreferences(
        req.userId!,
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      logger.error('Failed to get user preferences', {
        userId: req.userId,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async updatePreferences(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.info('Update user preferences request', {
        userId: req.userId,
        companyId: req.companyId,
        ip: req.ip,
      });

      const result = await usersService.updatePreferences(
        req.userId!,
        req.companyId!,
        req.body
      );

      logger.info('User preferences updated successfully', {
        userId: req.userId,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to update user preferences', {
        userId: req.userId,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
}

export default new UsersController();
