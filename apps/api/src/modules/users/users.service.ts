import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { hashPassword } from '../../utils/hash';

export class UsersService {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            currencyBase: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      ...user,
      companyName: user.company.name,
    };
  }

  async getAll(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Обновить пользователя (для администраторов)
   */
  async updateUser(
    userId: string,
    companyId: string,
    data: {
      firstName?: string;
      lastName?: string;
      isActive?: boolean;
    }
  ) {
    console.log('[UsersService.updateUser] Обновление пользователя', {
      userId,
      companyId,
      data,
    });

    // Проверка существования пользователя и принадлежности к компании
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, isSuperAdmin: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== companyId) {
      throw new AppError('User does not belong to this company', 403);
    }

    // Нельзя деактивировать супер-администратора
    if (data.isActive === false && user.isSuperAdmin) {
      throw new AppError('Cannot deactivate super administrator', 403);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('[UsersService.updateUser] Пользователь успешно обновлён', {
      userId,
      companyId,
      changes: data,
    });

    return updatedUser;
  }

  /**
   * Удалить пользователя
   */
  async deleteUser(userId: string, companyId: string, deletedBy: string) {
    console.log('[UsersService.deleteUser] Удаление пользователя', {
      userId,
      companyId,
      deletedBy,
    });

    // Проверка существования пользователя и принадлежности к компании
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        companyId: true,
        isSuperAdmin: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== companyId) {
      throw new AppError('User does not belong to this company', 403);
    }

    // Нельзя удалить супер-администратора
    if (user.isSuperAdmin) {
      throw new AppError('Cannot delete super administrator', 403);
    }

    // Удаляем пользователя (soft delete - деактивируем)
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    console.log('[UsersService.deleteUser] Пользователь успешно удалён', {
      userId,
      companyId,
      email: user.email,
    });

    return { success: true };
  }

  /**
   * Пригласить пользователя по email
   */
  async inviteUser(
    companyId: string,
    email: string,
    roleIds: string[],
    invitedBy: string
  ) {
    console.log('[UsersService.inviteUser] Приглашение пользователя', {
      companyId,
      email,
      roleIds,
      invitedBy,
    });

    // Проверка, не существует ли уже пользователь с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, companyId: true },
    });

    if (existingUser) {
      if (existingUser.companyId === companyId) {
        throw new AppError(
          'User with this email already exists in your company',
          409
        );
      } else {
        throw new AppError(
          'User with this email already exists in another company',
          409
        );
      }
    }

    // Проверка ролей
    if (roleIds.length > 0) {
      const roles = await prisma.role.findMany({
        where: {
          id: { in: roleIds },
          companyId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (roles.length !== roleIds.length) {
        throw new AppError('One or more roles not found or inactive', 404);
      }
    }

    // TODO: В будущем здесь будет отправка email с приглашением
    // Пока просто создаём пользователя с временным паролем или флагом "ожидает активации"
    // Для простоты создаём пользователя с дефолтным паролем (в продакшене нужно генерировать токен приглашения)

    // Генерируем временный пароль (в продакшене это должно быть через токен приглашения)
    const tempPassword = `temp_${Math.random().toString(36).slice(2)}`;
    const passwordHash = await hashPassword(tempPassword);

    // Создаём пользователя
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        companyId,
        isActive: true, // Или false, если требуется активация через email
        // Можно добавить поле isInvited: true для отслеживания
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Назначаем роли, если указаны
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId: newUser.id,
          roleId,
          assignedBy: invitedBy,
        })),
      });
    }

    console.log('[UsersService.inviteUser] Пользователь успешно приглашён', {
      userId: newUser.id,
      email,
      roleIds,
      invitedBy,
    });

    // TODO: Отправить email с приглашением

    // Возвращаем пользователя с временным паролем (только для отображения администратору)
    return {
      ...newUser,
      tempPassword, // Временный пароль возвращаем только один раз
    };
  }

  async updateMe(
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      isActive?: boolean;
    }
  ) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        isActive: true,
        company: {
          select: {
            id: true,
            name: true,
            currencyBase: true,
          },
        },
      },
    });

    return {
      ...updatedUser,
      companyName: updatedUser.company.name,
    };
  }

  /**
   * Назначить роль пользователю
   */
  async assignRole(
    userId: string,
    roleId: string,
    companyId: string,
    assignedBy: string
  ) {
    console.log(
      '[UsersService.assignRole] Начало назначения роли пользователю',
      {
        userId,
        roleId,
        companyId,
        assignedBy,
      }
    );

    // Проверка существования пользователя и принадлежности к компании
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, isActive: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== companyId) {
      throw new AppError('User does not belong to this company', 403);
    }

    if (!user.isActive) {
      throw new AppError('Cannot assign role to inactive user', 403);
    }

    // Проверка существования роли и принадлежности к компании
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        companyId: true,
        isActive: true,
        deletedAt: true,
        name: true,
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (role.companyId !== companyId) {
      throw new AppError('Role does not belong to this company', 403);
    }

    if (!role.isActive || role.deletedAt) {
      throw new AppError('Cannot assign inactive or deleted role', 403);
    }

    // Проверка, не назначена ли уже эта роль
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (existingUserRole) {
      console.log('[UsersService.assignRole] Роль уже назначена пользователю', {
        userId,
        roleId,
        userRoleId: existingUserRole.id,
      });
      throw new AppError('Role is already assigned to this user', 409);
    }

    // Назначение роли
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            isSystem: true,
          },
        },
      },
    });

    console.log(
      '[UsersService.assignRole] Роль успешно назначена пользователю',
      {
        userRoleId: userRole.id,
        userId,
        roleId,
        roleName: userRole.role.name,
        assignedBy,
      }
    );

    return userRole;
  }

  /**
   * Снять роль с пользователя
   */
  async removeRole(userId: string, roleId: string, companyId: string) {
    console.log('[UsersService.removeRole] Начало снятия роли с пользователя', {
      userId,
      roleId,
      companyId,
    });

    // Проверка существования пользователя и принадлежности к компании
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== companyId) {
      throw new AppError('User does not belong to this company', 403);
    }

    // Проверка существования роли и принадлежности к компании
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, companyId: true, isSystem: true, name: true },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (role.companyId !== companyId) {
      throw new AppError('Role does not belong to this company', 403);
    }

    // Проверка, что роль не системная (нельзя снимать системные роли)
    if (role.isSystem) {
      console.log('[UsersService.removeRole] Попытка снять системную роль', {
        userId,
        roleId,
        roleName: role.name,
      });
      throw new AppError('Cannot remove system role', 403);
    }

    // Поиск связи пользователя и роли
    const userRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (!userRole) {
      throw new AppError('Role is not assigned to this user', 404);
    }

    // Удаление связи
    await prisma.userRole.delete({
      where: { id: userRole.id },
    });

    console.log('[UsersService.removeRole] Роль успешно снята с пользователя', {
      userRoleId: userRole.id,
      userId,
      roleId,
      roleName: role.name,
    });

    return { success: true };
  }

  /**
   * Получить роли пользователя
   */
  async getUserRoles(userId: string, companyId: string) {
    console.log('[UsersService.getUserRoles] Получение ролей пользователя', {
      userId,
      companyId,
    });

    // Проверка существования пользователя и принадлежности к компании
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, isActive: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== companyId) {
      throw new AppError('User does not belong to this company', 403);
    }

    const userRoles = await prisma.userRole.findMany({
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
            description: true,
            category: true,
            isSystem: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    console.log('[UsersService.getUserRoles] Роли пользователя получены', {
      userId,
      companyId,
      rolesCount: userRoles.length,
    });

    return userRoles;
  }
}

export default new UsersService();
