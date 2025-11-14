import prisma from '../../config/db';
import logger from '../../config/logger';

/**
 * Миграционный скрипт для существующих пользователей
 * Назначает роли всем пользователям, у которых их нет
 * - Первому пользователю компании назначается роль "Супер-пользователь"
 * - Остальным пользователям назначается роль "По умолчанию"
 */
export async function migrateExistingUsers(): Promise<void> {
  logger.info(
    '[migrateExistingUsers] Начало миграции существующих пользователей'
  );

  try {
    // Получаем все компании
    const companies = await prisma.company.findMany({
      select: { id: true },
    });

    logger.info('[migrateExistingUsers] Найдено компаний:', {
      count: companies.length,
    });

    let totalUsersMigrated = 0;
    let totalRolesCreated = 0;

    for (const company of companies) {
      logger.info('[migrateExistingUsers] Обработка компании:', {
        companyId: company.id,
      });

      // Определяем все сущности и действия согласно ТЗ
      const entities = [
        {
          name: 'articles',
          actions: ['create', 'read', 'update', 'delete', 'archive', 'restore'],
        },
        { name: 'accounts', actions: ['create', 'read', 'update', 'delete'] },
        {
          name: 'departments',
          actions: ['create', 'read', 'update', 'delete'],
        },
        {
          name: 'counterparties',
          actions: ['create', 'read', 'update', 'delete'],
        },
        { name: 'deals', actions: ['create', 'read', 'update', 'delete'] },
        { name: 'salaries', actions: ['create', 'read', 'update', 'delete'] },
        {
          name: 'operations',
          actions: ['create', 'read', 'update', 'delete', 'confirm', 'cancel'],
        },
        {
          name: 'budgets',
          actions: ['create', 'read', 'update', 'delete', 'archive', 'restore'],
        },
        { name: 'reports', actions: ['read', 'export'] },
        {
          name: 'users',
          actions: ['create', 'read', 'update', 'delete', 'manage_roles'],
        },
        { name: 'audit', actions: ['read'] },
      ];

      // Проверяем, существуют ли системные роли для этой компании
      let superAdminRole = await prisma.role.findFirst({
        where: {
          companyId: company.id,
          name: 'Супер-пользователь',
          isSystem: true,
        },
      });

      let defaultRole = await prisma.role.findFirst({
        where: {
          companyId: company.id,
          name: 'По умолчанию',
          isSystem: true,
        },
      });

      // Создаём или обновляем роль "Супер-пользователь"
      if (!superAdminRole) {
        logger.info(
          '[migrateExistingUsers] Создание роли "Супер-пользователь" для компании:',
          {
            companyId: company.id,
          }
        );

        superAdminRole = await prisma.role.create({
          data: {
            companyId: company.id,
            name: 'Супер-пользователь',
            description:
              'Системная роль с полными правами доступа ко всем функциям системы',
            category: 'Системные',
            isSystem: true,
            isActive: true,
          },
        });

        totalRolesCreated += 1;
      } else {
        logger.info(
          '[migrateExistingUsers] Роль "Супер-пользователь" уже существует, обновляем права:',
          {
            roleId: superAdminRole.id,
            companyId: company.id,
          }
        );
      }

      // Получаем все существующие права роли "Супер-пользователь"
      const existingPermissions = await prisma.rolePermission.findMany({
        where: {
          roleId: superAdminRole.id,
        },
      });

      // Создаём Set для быстрой проверки существующих прав
      const existingPermissionsSet = new Set(
        existingPermissions.map((p) => `${p.entity}:${p.action}`)
      );

      // Формируем полный список всех необходимых прав
      const allRequiredPermissions = [];
      for (const entity of entities) {
        for (const action of entity.actions) {
          const permissionKey = `${entity.name}:${action}`;
          if (!existingPermissionsSet.has(permissionKey)) {
            allRequiredPermissions.push({
              roleId: superAdminRole.id,
              entity: entity.name,
              action,
              allowed: true,
            });
          }
        }
      }

      // Добавляем недостающие права
      if (allRequiredPermissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: allRequiredPermissions,
          skipDuplicates: true,
        });

        logger.info(
          '[migrateExistingUsers] Добавлены недостающие права для роли "Супер-пользователь":',
          {
            roleId: superAdminRole.id,
            addedCount: allRequiredPermissions.length,
            addedPermissions: allRequiredPermissions.map(
              (p) => `${p.entity}:${p.action}`
            ),
          }
        );
      }

      // Убеждаемся, что все права установлены в allowed: true (на случай, если были изменены)
      const updatedCount = await prisma.rolePermission.updateMany({
        where: {
          roleId: superAdminRole.id,
          allowed: false,
        },
        data: {
          allowed: true,
        },
      });

      if (updatedCount.count > 0) {
        logger.info(
          '[migrateExistingUsers] Обновлены права роли "Супер-пользователь" на allowed: true:',
          {
            roleId: superAdminRole.id,
            updatedCount: updatedCount.count,
          }
        );
      }

      // Получаем финальный список всех прав для логирования
      const finalPermissions = await prisma.rolePermission.findMany({
        where: {
          roleId: superAdminRole.id,
        },
      });

      logger.info(
        '[migrateExistingUsers] Финальные права для роли "Супер-пользователь":',
        {
          roleId: superAdminRole.id,
          totalPermissionsCount: finalPermissions.length,
          permissions: finalPermissions.map((p) => `${p.entity}:${p.action}`),
        }
      );

      if (!defaultRole) {
        logger.info(
          '[migrateExistingUsers] Создание роли "По умолчанию" для компании:',
          {
            companyId: company.id,
          }
        );

        defaultRole = await prisma.role.create({
          data: {
            companyId: company.id,
            name: 'По умолчанию',
            description:
              'Системная роль с минимальными правами (только просмотр)',
            category: 'Системные',
            isSystem: true,
            isActive: true,
          },
        });

        // Создаем права только на чтение для роли "По умолчанию"
        const defaultPermissions = [];
        for (const entity of entities) {
          // Для reports добавляем только read (export не даём)
          if (entity.name === 'reports') {
            defaultPermissions.push({
              roleId: defaultRole.id,
              entity: entity.name,
              action: 'read',
              allowed: true,
            });
          } else {
            // Для остальных сущностей добавляем только read
            defaultPermissions.push({
              roleId: defaultRole.id,
              entity: entity.name,
              action: 'read',
              allowed: true,
            });
          }
        }

        await prisma.rolePermission.createMany({
          data: defaultPermissions,
        });

        totalRolesCreated += 1;
        logger.info(
          '[migrateExistingUsers] Создана роль "По умолчанию" с правами:',
          {
            roleId: defaultRole.id,
            permissionsCount: defaultPermissions.length,
          }
        );
      }

      // Получаем всех пользователей компании, у которых нет ролей
      const usersWithoutRoles = await prisma.user.findMany({
        where: {
          companyId: company.id,
          userRoles: {
            none: {},
          },
        },
        orderBy: {
          createdAt: 'asc', // Сортируем по дате создания, чтобы первый пользователь был первым
        },
      });

      logger.info('[migrateExistingUsers] Найдено пользователей без ролей:', {
        companyId: company.id,
        count: usersWithoutRoles.length,
      });

      if (usersWithoutRoles.length === 0) {
        logger.info(
          '[migrateExistingUsers] Все пользователи компании уже имеют роли:',
          {
            companyId: company.id,
          }
        );
        continue;
      }

      // Назначаем роль "Супер-пользователь" первому пользователю
      const firstUser = usersWithoutRoles[0];
      if (firstUser && superAdminRole) {
        await prisma.userRole.create({
          data: {
            userId: firstUser.id,
            roleId: superAdminRole.id,
            assignedBy: null, // Системное назначение
          },
        });

        totalUsersMigrated += 1;
        logger.info(
          '[migrateExistingUsers] Назначена роль "Супер-пользователь" первому пользователю:',
          {
            companyId: company.id,
            userId: firstUser.id,
            roleId: superAdminRole.id,
          }
        );
      }

      // Назначаем роль "По умолчанию" остальным пользователям
      const remainingUsers = usersWithoutRoles.slice(1);
      if (remainingUsers.length > 0 && defaultRole) {
        const userRoles = remainingUsers.map((user) => ({
          userId: user.id,
          roleId: defaultRole!.id,
          assignedBy: null, // Системное назначение
        }));

        await prisma.userRole.createMany({
          data: userRoles,
        });

        totalUsersMigrated += remainingUsers.length;
        logger.info(
          '[migrateExistingUsers] Назначена роль "По умолчанию" остальным пользователям:',
          {
            companyId: company.id,
            usersCount: remainingUsers.length,
            roleId: defaultRole.id,
          }
        );
      }
    }

    logger.info('[migrateExistingUsers] Миграция завершена успешно:', {
      companiesProcessed: companies.length,
      totalUsersMigrated,
      totalRolesCreated,
    });
  } catch (error) {
    logger.error('[migrateExistingUsers] Ошибка при миграции:', error);
    throw error;
  }
}

/**
 * Запуск миграции (можно вызвать из CLI или при старте приложения)
 */
if (require.main === module) {
  migrateExistingUsers()
    .then(() => {
      logger.info('[migrateExistingUsers] Миграция завершена');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[migrateExistingUsers] Ошибка миграции:', error);
      process.exit(1);
    });
}
