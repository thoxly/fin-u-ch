import prisma from '../../config/db';
import logger from '../../config/logger';
import { ENTITIES_CONFIG } from '../roles/config/entities.config';

/**
 * Миграционный скрипт для существующих пользователей
 * Назначает роли всем пользователям, у которых их нет
 * - Первому пользователю компании назначается роль "Супер-пользователь"
 * - Остальным пользователям назначается роль "Добавление операций" (если существует)
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

      // Используем централизованную конфигурацию сущностей
      const entities = Object.values(ENTITIES_CONFIG).map((entity) => ({
        name: entity.name,
        actions: entity.actions,
      }));

      // Проверяем, существуют ли системные роли для этой компании
      let superAdminRole = await prisma.role.findFirst({
        where: {
          companyId: company.id,
          name: 'Супер-пользователь',
          isSystem: true,
        },
      });

      // Ищем предустановленную роль "Добавление операций" (не системную)
      let operationsEditorRole = await prisma.role.findFirst({
        where: {
          companyId: company.id,
          name: 'Добавление операций',
          isSystem: false,
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

      if (!operationsEditorRole) {
        logger.info(
          '[migrateExistingUsers] Создание роли "Добавление операций" для компании:',
          {
            companyId: company.id,
          }
        );

        operationsEditorRole = await prisma.role.create({
          data: {
            companyId: company.id,
            name: 'Добавление операций',
            description:
              'Возможность создавать и просматривать операции, а также просматривать справочники',
            category: 'Предустановленные',
            isSystem: false,
            isActive: true,
          },
        });

        // Создаем права для роли "Добавление операций"
        const operationsEditorPermissions = [];

        // Для операций: create и read
        operationsEditorPermissions.push({
          roleId: operationsEditorRole.id,
          entity: 'operations',
          action: 'create',
          allowed: true,
        });
        operationsEditorPermissions.push({
          roleId: operationsEditorRole.id,
          entity: 'operations',
          action: 'read',
          allowed: true,
        });

        // Для dashboard: read
        operationsEditorPermissions.push({
          roleId: operationsEditorRole.id,
          entity: 'dashboard',
          action: 'read',
          allowed: true,
        });

        // Для всех справочников (кроме администрирования): только read
        const catalogEntities = [
          'articles',
          'accounts',
          'counterparties',
          'departments',
          'deals',
        ];
        for (const entityName of catalogEntities) {
          operationsEditorPermissions.push({
            roleId: operationsEditorRole.id,
            entity: entityName,
            action: 'read',
            allowed: true,
          });
        }

        // Для отчетов: только read (без export)
        operationsEditorPermissions.push({
          roleId: operationsEditorRole.id,
          entity: 'reports',
          action: 'read',
          allowed: true,
        });

        await prisma.rolePermission.createMany({
          data: operationsEditorPermissions,
        });

        totalRolesCreated += 1;
        logger.info(
          '[migrateExistingUsers] Создана роль "Добавление операций" с правами:',
          {
            roleId: operationsEditorRole.id,
            permissionsCount: operationsEditorPermissions.length,
          }
        );
      }

      // Получаем всех пользователей компании, у которых нет ролей
      const usersWithoutRoles = await prisma.user.findMany({
        where: {
          companyId: company.id,
          user_roles: {
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

      // Назначаем роль "Добавление операций" остальным пользователям
      const remainingUsers = usersWithoutRoles.slice(1);
      if (remainingUsers.length > 0 && operationsEditorRole) {
        const userRoles = remainingUsers.map((user) => ({
          userId: user.id,
          roleId: operationsEditorRole!.id,
          assignedBy: null, // Системное назначение
        }));

        await prisma.userRole.createMany({
          data: userRoles,
        });

        totalUsersMigrated += remainingUsers.length;
        logger.info(
          '[migrateExistingUsers] Назначена роль "Добавление операций" остальным пользователям:',
          {
            companyId: company.id,
            usersCount: remainingUsers.length,
            roleId: operationsEditorRole.id,
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
