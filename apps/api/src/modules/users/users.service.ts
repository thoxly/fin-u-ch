import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { hashPassword, verifyPassword } from '../../utils/hash';
import { Prisma } from '@prisma/client';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../utils/validation';
import {
  sendPasswordChangedEmail,
  sendEmailChangeOldVerificationEmail,
  sendEmailChangeVerificationEmail,
  sendInvitationEmail,
} from '../../services/mail/mail.service';
import tokenService from '../../services/mail/token.service';
import logger from '../../config/logger';

// Типы для работы с пользователями и компаниями
// Используются для правильной типизации результатов Prisma запросов с include
type CompanySelect = {
  id: string;
  name: string;
  currencyBase: string;
  inn?: string | null;
};

type UserWithCompany<T = CompanySelect> = {
  id: string;
  email: string;
  companyId: string;
  isActive: boolean;
  createdAt: Date;
  firstName: string | null;
  lastName: string | null;
  company: T | null;
};

// Вспомогательная функция для обработки ошибок нарушения уникального ограничения Prisma
function handleUniqueConstraintError(
  error: unknown,
  field: string,
  message?: string
): void {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2002' &&
    'meta' in error &&
    error.meta &&
    typeof error.meta === 'object' &&
    'target' in error.meta &&
    Array.isArray(error.meta.target) &&
    error.meta.target.includes(field)
  ) {
    throw new AppError(message || `${field} already in use`, 409);
  }
  // Пробрасываем другие ошибки дальше
  throw error;
}

// Вспомогательные функции для смены email
async function validateEmailChange(
  userId: string,
  newEmail: string,
  companyId: string
): Promise<{ user: { id: string; email: string } }> {
  validateEmail(newEmail);

  // Проверяем, что пользователь принадлежит к указанной компании
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      companyId: companyId,
    },
    select: { id: true, email: true, companyId: true },
  });

  if (!user) {
    throw new AppError('User not found or access denied', 404);
  }

  if (user.email === newEmail) {
    throw new AppError('New email is the same as current email', 400);
  }

  // Проверяем, что email не занят в рамках текущей компании
  // Используем findFirst с фильтром по companyId для предотвращения утечки данных между компаниями
  const existingUser = await prisma.user.findFirst({
    where: {
      email: newEmail,
      companyId: companyId,
    },
    select: { id: true, companyId: true },
  });

  if (existingUser) {
    // Если email занят другим пользователем из той же компании, это ошибка
    if (existingUser.id !== userId) {
      throw new AppError('Email already in use', 409);
    }
  }

  return { user };
}

async function createOldEmailToken(
  userId: string,
  newEmail: string
): Promise<string> {
  return await tokenService.createToken({
    userId,
    type: 'email_change_old',
    metadata: { newEmail },
  });
}

async function sendOldEmailVerification(
  oldEmail: string,
  newEmail: string,
  token: string,
  userId: string
): Promise<void> {
  try {
    await sendEmailChangeOldVerificationEmail(oldEmail, newEmail, token);
    logger.info('Email change verification sent to old email', { userId });
  } catch (error) {
    // Если отправка email не удалась, удаляем созданный токен
    try {
      await tokenService.markTokenAsUsed(token);
    } catch (cleanupError) {
      logger.error('Failed to cleanup token after email send failure', {
        userId,
        error: cleanupError,
      });
    }
    throw error;
  }
}

async function createNewEmailToken(
  userId: string,
  newEmail: string
): Promise<string> {
  return await tokenService.createToken({
    userId,
    type: 'email_change_new',
    metadata: { newEmail },
  });
}

async function sendNewEmailVerification(
  newEmail: string,
  token: string,
  userId: string
): Promise<void> {
  try {
    await sendEmailChangeVerificationEmail(newEmail, token);
    logger.info('Email change verification sent to new email', { userId });
  } catch (error) {
    // Если отправка email не удалась, удаляем созданный токен
    try {
      await tokenService.markTokenAsUsed(token);
    } catch (cleanupError) {
      logger.error('Failed to cleanup token after email send failure', {
        userId,
        error: cleanupError,
      });
    }
    throw error;
  }
}

async function processOldEmailConfirmation(
  token: string,
  userId: string,
  newEmail: string
): Promise<void> {
  // Помечаем токен старого email как использованный в транзакции
  await prisma.$transaction(async (tx) => {
    await tx.emailToken.update({
      where: { token },
      data: { used: true },
    });
  });

  const newEmailToken = await createNewEmailToken(userId, newEmail);
  await sendNewEmailVerification(newEmail, newEmailToken, userId);
}

export class UsersService {
  async getMe(userId: string, companyId: string) {
    // Проверяем, что пользователь принадлежит к указанной компании
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId,
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
        company: {
          select: {
            id: true,
            name: true,
            currencyBase: true,
            inn: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found or access denied', 404);
    }

    if (!user.company) {
      throw new AppError('Company not found for user', 500);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.companyId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      companyName: user.company.name,
      company: {
        id: user.company.id,
        name: user.company.name,
        currencyBase: user.company.currencyBase,
        inn: user.company.inn,
      },
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
    logger.debug('[UsersService.updateUser] Обновление пользователя', {
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

    logger.debug('[UsersService.updateUser] Пользователь успешно обновлён', {
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
    logger.debug('[UsersService.deleteUser] Удаление пользователя', {
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

    // Нельзя удалить супер-администратора (через админку)
    if (user.isSuperAdmin) {
      throw new AppError('Cannot delete super administrator', 403);
    }

    // Удаляем пользователя (soft delete)
    const deletedEmail = `${user.email}.deleted.${Date.now()}`;

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        email: deletedEmail, // Освобождаем email
      },
    });

    logger.debug('[UsersService.deleteUser] Пользователь успешно удалён', {
      userId,
      companyId,
      originalEmail: user.email,
      deletedEmail,
    });

    return { success: true };
  }

  /**
   * Удалить свой аккаунт (включая удаление из БД и всей компании)
   * Удаляет все пользователи компании (включая неактивных/приглашённых),
   * все данные компании и саму компанию
   */
  async deleteMyAccount(userId: string, companyId: string) {
    logger.warn(
      '[UsersService.deleteMyAccount] Удаление своего аккаунта и компании',
      {
        userId,
        companyId,
      }
    );

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        isSuperAdmin: true,
        email: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== companyId) {
      throw new AppError('User does not belong to this company', 403);
    }

    // Выполняем полное удаление компании и всех связанных данных в транзакции
    await prisma.$transaction(async (tx) => {
      logger.debug('[UsersService.deleteMyAccount] Удаление данных компании', {
        companyId,
      });

      // 1. Сначала удаляем записи из таблиц, которые ссылаются на другие таблицы (чтобы избежать FK ошибок)
      // ImportedOperation ссылается на многое, удаляем первой
      await tx.importedOperation.deleteMany({ where: { companyId } });

      // Удаляем сессии импорта
      await tx.importSession.deleteMany({ where: { companyId } });

      // Удаляем правила маппинга
      await tx.mappingRule.deleteMany({ where: { companyId } });

      // Удаляем логи аудита (ссылаются на User и Company)
      await tx.auditLog.deleteMany({ where: { companyId } });

      // Удаляем операции
      await tx.operation.deleteMany({ where: { companyId } });

      // Удаляем элементы плана
      await tx.planItem.deleteMany({ where: { companyId } });

      // Удаляем зарплаты

      // Удаляем интеграции
      await (tx as any).integration.deleteMany({ where: { companyId } });

      // 2. Удаляем основные сущности
      await tx.budget.deleteMany({ where: { companyId } });
      await tx.deal.deleteMany({ where: { companyId } });
      await tx.article.deleteMany({ where: { companyId } }); // Article может ссылаться на себя (parentId), но deleteMany обычно справляется
      await tx.account.deleteMany({ where: { companyId } });
      await tx.counterparty.deleteMany({ where: { companyId } });
      await tx.department.deleteMany({ where: { companyId } });
      await (tx as any).subscription.deleteMany({ where: { companyId } });

      // Удаляем роли (и связанные RolePermission удалятся каскадно)
      await tx.role.deleteMany({ where: { companyId } });

      // 3. Удаляем всех пользователей компании
      // Сначала удаляем токены email, хотя они удалятся каскадно, но на всякий случай
      // await tx.emailToken.deleteMany({ where: { user: { companyId } } });

      // Удаляем пользователей
      await tx.user.deleteMany({
        where: { companyId },
      });

      // 4. Удаляем саму компанию
      await tx.company.delete({ where: { id: companyId } });
    });

    logger.warn(
      '[UsersService.deleteMyAccount] Аккаунт и компания полностью удалены',
      {
        userId,
        companyId,
        email: user.email,
      }
    );

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
    logger.debug('[UsersService.inviteUser] Приглашение пользователя', {
      companyId,
      email,
      roleIds,
      invitedBy,
    });

    // Проверка, не существует ли уже пользователь с таким email
    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        companyId: true,
        isActive: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user) {
      // Если пользователь существует, проверяем компанию
      if (user.companyId !== companyId) {
        throw new AppError(
          'Пользователь с таким email уже существует в другой компании',
          409
        );
      }

      // Если пользователь активен, нельзя приглашать повторно (он уже в системе)
      if (user.isActive) {
        throw new AppError(
          'Пользователь с таким email уже активен в вашей компании',
          409
        );
      }

      // Если пользователь существует но неактивен, считаем это повторным приглашением
      logger.info(
        '[UsersService.inviteUser] Повторное приглашение неактивного пользователя',
        { userId: user.id }
      );
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

    // Получаем название компании для письма
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (!user) {
      // Создаем нового пользователя, если не найден
      const tempPassword = `temp_${Math.random().toString(36).slice(2)}`;
      const passwordHash = await hashPassword(tempPassword);

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          companyId,
          isActive: false, // Пользователь неактивен до принятия приглашения
          isEmailVerified: false,
        },
        select: {
          id: true,
          email: true,
          companyId: true,
          isActive: true,
          firstName: true,
          lastName: true,
          isSuperAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Создаём токен приглашения (нового или повторного)
    const invitationToken = await tokenService.createToken({
      userId: user.id,
      type: 'user_invitation',
      metadata: {
        roleIds,
        companyId,
        invitedBy,
      },
    });

    // Отправляем письмо с приглашением
    try {
      await sendInvitationEmail(email, invitationToken, company.name);
      logger.info('Invitation email sent successfully', {
        userId: user.id,
        email,
        companyId,
      });
    } catch (error) {
      logger.error('Failed to send invitation email', {
        userId: user.id,
        email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // ВАЖНО: Если это НОВЫЙ пользователь и письмо не ушло, имеет смысл откатить создание?
      // Или просто выбросить ошибку, чтобы фронтенд знал.
      // Сейчас мы выбросим ошибку, чтобы админ видел проблему.

      // Если это повторное приглашение, пользователь уже был в базе, ничего страшного (просто письмо не ушло).

      throw new AppError(
        'Не удалось отправить письмо с приглашением. Проверьте настройки SMTP.',
        500
      );
    }

    logger.debug('[UsersService.inviteUser] Пользователь успешно приглашён', {
      userId: user.id,
      email,
      roleIds,
      invitedBy,
    });

    return user;
  }

  async updateMe(
    userId: string,
    companyId: string,
    data: {
      firstName?: string;
      lastName?: string;
    }
  ) {
    // Email нельзя изменять через updateMe - для этого есть отдельный процесс с верификацией
    // Проверяем, что пользователь принадлежит к указанной компании перед обновлением
    const userCheck = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId,
      },
      select: { id: true },
    });

    if (!userCheck) {
      throw new AppError('User not found or access denied', 404);
    }

    // Обновляем пользователя в транзакции с проверкой companyId для предотвращения утечки данных
    // Полагаемся на уникальное ограничение базы данных для предотвращения race condition.
    try {
      const updatedUser = await prisma.$transaction(async (tx) => {
        // Проверяем, что пользователь принадлежит к этой компании перед обновлением
        const userCheckInTx = await tx.user.findFirst({
          where: {
            id: userId,
            companyId: companyId,
          },
          select: { id: true },
        });

        if (!userCheckInTx) {
          throw new AppError('User not found or access denied', 404);
        }

        // Используем updateMany для безопасной фильтрации по companyId
        const updateResult = await tx.user.updateMany({
          where: {
            id: userId,
            companyId: companyId,
          },
          data,
        });

        if (updateResult.count === 0) {
          throw new AppError('User not found or access denied', 404);
        }

        // Получаем обновленного пользователя
        const updatedUser = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                currencyBase: true,
                inn: true,
              } as Prisma.CompanySelect,
            },
          },
        });

        // Типизируем результат с учетом включенных связей
        const userWithCompany =
          updatedUser as unknown as UserWithCompany<CompanySelect>;

        if (!userWithCompany.company) {
          throw new AppError('Company not found for user', 500);
        }

        return {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: userWithCompany.firstName,
          lastName: userWithCompany.lastName,
          companyId: updatedUser.companyId,
          isActive: updatedUser.isActive,
          company: userWithCompany.company,
        };
      });

      // Типизируем результат с учетом включенных связей
      const resultWithCompany =
        updatedUser as unknown as UserWithCompany<CompanySelect>;

      // Проверяем наличие company (должна быть, так как проверяли внутри транзакции)
      if (!resultWithCompany.company) {
        throw new AppError('Company not found for user', 500);
      }

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: resultWithCompany.firstName,
        lastName: resultWithCompany.lastName,
        companyId: updatedUser.companyId,
        isActive: updatedUser.isActive,
        companyName: resultWithCompany.company.name,
        company: {
          id: resultWithCompany.company.id,
          name: resultWithCompany.company.name,
          currencyBase: resultWithCompany.company.currencyBase,
          inn: resultWithCompany.company.inn,
        },
      };
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      handleUniqueConstraintError(error, 'email', 'Email already in use');
      throw error; // Re-throw after handling
    }
  }

  async updatePreferences(
    userId: string,
    companyId: string,
    preferences: Record<string, unknown>
  ) {
    const userCheck = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId,
      },
      select: { id: true },
    });

    if (!userCheck) {
      throw new AppError('User not found or access denied', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: preferences as Prisma.InputJsonValue,
      },
      select: {
        preferences: true,
      },
    });

    return (updatedUser.preferences as Record<string, unknown>) || {};
  }

  async getPreferences(userId: string, companyId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId,
      },
      select: {
        preferences: true,
      },
    });

    if (!user) {
      throw new AppError('User not found or access denied', 404);
    }

    return (user.preferences as Record<string, unknown>) || {};
  }

  async changePassword(
    userId: string,
    companyId: string,
    currentPassword: string,
    newPassword: string
  ) {
    validateRequired({ currentPassword, newPassword });
    validatePassword(newPassword);

    // Проверяем, что пользователь принадлежит к указанной компании
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId,
      },
    });

    if (!user) {
      throw new AppError('User not found or access denied', 404);
    }

    const isPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    // Обновляем пароль в транзакции с проверкой companyId для предотвращения утечки данных
    await prisma.$transaction(async (tx) => {
      // Проверяем, что пользователь принадлежит к этой компании перед обновлением
      const userCheckInTx = await tx.user.findFirst({
        where: {
          id: userId,
          companyId: companyId,
        },
        select: { id: true },
      });

      if (!userCheckInTx) {
        throw new AppError('User not found or access denied', 404);
      }

      // Используем updateMany для безопасной фильтрации по companyId
      const updateResult = await tx.user.updateMany({
        where: {
          id: userId,
          companyId: companyId,
        },
        data: { passwordHash },
      });

      if (updateResult.count === 0) {
        throw new AppError('User not found or access denied', 404);
      }
    });

    // Отправляем уведомление об изменении пароля
    try {
      await sendPasswordChangedEmail(user.email);
    } catch (error) {
      logger.error('Failed to send password changed email', {
        userId,
        error,
      });
      // Не блокируем смену пароля, если письмо не отправилось
    }

    logger.info(`Password changed for user ${userId}`);
  }

  async requestEmailChange(
    userId: string,
    companyId: string,
    newEmail: string
  ) {
    const { user } = await validateEmailChange(userId, newEmail, companyId);

    try {
      const oldEmailToken = await createOldEmailToken(user.id, newEmail);
      await sendOldEmailVerification(
        user.email,
        newEmail,
        oldEmailToken,
        userId
      );
    } catch (error) {
      logger.error('Failed to send email change verification', {
        userId,
        error,
      });
      throw new AppError('Failed to send verification email', 500);
    }
  }

  async confirmOldEmailForChange(
    token: string,
    companyId: string
  ): Promise<void> {
    const validation = await tokenService.validateToken(
      token,
      'email_change_old'
    );

    if (!validation.valid || !validation.userId) {
      throw new AppError(validation.error || 'Invalid token', 400);
    }

    // Проверяем, что пользователь принадлежит к указанной компании
    const user = await prisma.user.findFirst({
      where: {
        id: validation.userId,
        companyId: companyId,
      },
      select: { companyId: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const newEmail = validation.metadata?.newEmail as string | undefined;

    if (!newEmail) {
      throw new AppError('New email not found in token', 400);
    }

    await validateEmailChange(validation.userId, newEmail, user.companyId);

    try {
      await processOldEmailConfirmation(token, validation.userId, newEmail);
    } catch (error) {
      logger.error('Failed to send email change verification to new email', {
        userId: validation.userId,
        error,
      });
      throw new AppError(
        'Failed to send verification email to new address',
        500
      );
    }
  }

  async confirmEmailChangeWithEmail(
    token: string,
    companyId: string
  ): Promise<void> {
    const validation = await tokenService.validateToken(
      token,
      'email_change_new'
    );

    if (!validation.valid || !validation.userId) {
      throw new AppError(validation.error || 'Invalid token', 400);
    }

    // Проверяем, что пользователь принадлежит к указанной компании
    // Включаем companyId в WHERE условие для предотвращения утечки данных между компаниями
    const user = await prisma.user.findFirst({
      where: {
        id: validation.userId,
        companyId: companyId,
      },
      select: { companyId: true },
    });

    if (!user) {
      throw new AppError('User not found or access denied', 404);
    }

    const newEmail = validation.metadata?.newEmail as string | undefined;

    if (!newEmail) {
      throw new AppError('New email not found in token', 400);
    }

    validateEmail(newEmail);

    // Обновляем email в транзакции с проверкой companyId для предотвращения утечки данных
    // Полагаемся на уникальное ограничение базы данных для предотвращения race condition.
    try {
      await prisma.$transaction(async (tx) => {
        // Проверяем, что пользователь принадлежит к этой компании перед обновлением
        // (Prisma update поддерживает только уникальные поля в WHERE, поэтому проверяем отдельно)
        const userCheck = await tx.user.findFirst({
          where: {
            id: validation.userId,
            companyId: companyId,
          },
          select: { id: true },
        });

        if (!userCheck) {
          throw new AppError('User not found or access denied', 404);
        }

        // Используем updateMany для безопасной фильтрации по companyId
        const updateResult = await tx.user.updateMany({
          where: {
            id: validation.userId,
            companyId: companyId,
          },
          data: {
            email: newEmail,
            isEmailVerified: true, // Новый email считается подтвержденным
          },
        });

        if (updateResult.count === 0) {
          throw new AppError('User not found or access denied', 404);
        }

        await tokenService.markTokenAsUsed(token);
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      handleUniqueConstraintError(error, 'email', 'Email already in use');
    }

    logger.info('Email changed successfully', {
      userId: validation.userId,
    });
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
    logger.debug(
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
      logger.debug(
        '[UsersService.assignRole] Роль уже назначена пользователю',
        {
          userId,
          roleId,
          userRoleId: existingUserRole.id,
        }
      );
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

    logger.debug(
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
    logger.debug(
      '[UsersService.removeRole] Начало снятия роли с пользователя',
      {
        userId,
        roleId,
        companyId,
      }
    );

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
      logger.debug('[UsersService.removeRole] Попытка снять системную роль', {
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

    logger.debug(
      '[UsersService.removeRole] Роль успешно снята с пользователя',
      {
        userRoleId: userRole.id,
        userId,
        roleId,
        roleName: role.name,
      }
    );

    return { success: true };
  }

  /**
   * Получить роли пользователя
   */
  async getUserRoles(userId: string, companyId: string) {
    logger.debug('[UsersService.getUserRoles] Получение ролей пользователя', {
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

    logger.debug('[UsersService.getUserRoles] Роли пользователя получены', {
      userId,
      companyId,
      rolesCount: userRoles.length,
    });

    return userRoles;
  }
}

export default new UsersService();
