import prisma from '../../config/db';
import logger from '../../config/logger';
import { ENTITIES_CONFIG } from '../roles/config/entities.config';

/**
 * Миграционный скрипт для существующих пользователей
 * Назначает роли всем пользователям, у которых их нет
 * - Первому пользователю компании назначается роль "Супер-пользователь"
 * - Остальным пользователям назначается роль "Внесение операций" (если существует)
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

      // Ищем предустановленную роль "Внесение операций" (не системная)
      let operationsEditorRole = await prisma.role.findFirst({
        where: {
          companyId: company.id,
          name: 'Внесение операций',
          category: 'Предустановленные',
        },
      });

      // Если роль с названием "Добавление операций" существует, переименовываем её
      if (!operationsEditorRole) {
        const oldOperationsEditorRole = await prisma.role.findFirst({
          where: {
            companyId: company.id,
            name: 'Добавление операций',
            category: 'Предустановленные',
          },
        });

        if (oldOperationsEditorRole) {
          operationsEditorRole = await prisma.role.update({
            where: { id: oldOperationsEditorRole.id },
            data: {
              name: 'Внесение операций',
            },
          });
          logger.info(
            '[migrateExistingUsers] Переименована роль "Добавление операций" в "Внесение операций":',
            {
              roleId: operationsEditorRole.id,
              companyId: company.id,
            }
          );
        }
      }

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

      // Проверяем и создаем роль "Полный доступ"
      let fullAccessRole = await prisma.role.findFirst({
        where: {
          companyId: company.id,
          name: 'Полный доступ',
          category: 'Предустановленные',
        },
      });

      if (!fullAccessRole) {
        logger.info(
          '[migrateExistingUsers] Создание роли "Полный доступ" для компании:',
          {
            companyId: company.id,
          }
        );

        fullAccessRole = await prisma.role.create({
          data: {
            companyId: company.id,
            name: 'Полный доступ',
            description:
              'Полный доступ ко всем функциям системы кроме управления пользователями и ролями',
            category: 'Предустановленные',
            isSystem: false,
            isActive: true,
          },
        });

        totalRolesCreated += 1;
      } else {
        logger.info(
          '[migrateExistingUsers] Роль "Полный доступ" уже существует, обновляем права:',
          {
            roleId: fullAccessRole.id,
            companyId: company.id,
          }
        );
      }

      // Получаем все существующие права роли "Полный доступ"
      const existingFullAccessPermissions =
        await prisma.rolePermission.findMany({
          where: {
            roleId: fullAccessRole.id,
          },
        });

      // Создаём Set для быстрой проверки существующих прав
      const existingFullAccessPermissionsSet = new Set(
        existingFullAccessPermissions.map((p) => `${p.entity}:${p.action}`)
      );

      // Создаем права: все действия кроме сущностей категории "Администрирование"
      const fullAccessPermissions = [];
      for (const entity of entities) {
        const entityConfig = ENTITIES_CONFIG[entity.name];

        // Исключаем сущности категории "Администрирование"
        if (entityConfig?.category !== 'Администрирование') {
          for (const action of entity.actions) {
            const permissionKey = `${entity.name}:${action}`;
            if (!existingFullAccessPermissionsSet.has(permissionKey)) {
              fullAccessPermissions.push({
                roleId: fullAccessRole.id,
                entity: entity.name,
                action,
                allowed: true,
              });
            }
          }
        }
      }

      if (fullAccessPermissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: fullAccessPermissions,
          skipDuplicates: true,
        });
      }

      // Убеждаемся, что все права установлены в allowed: true
      await prisma.rolePermission.updateMany({
        where: {
          roleId: fullAccessRole.id,
          allowed: false,
        },
        data: {
          allowed: true,
        },
      });

      logger.info(
        '[migrateExistingUsers] Обновлены права для роли "Полный доступ":',
        {
          roleId: fullAccessRole.id,
          addedCount: fullAccessPermissions.length,
        }
      );

      if (!operationsEditorRole) {
        logger.info(
          '[migrateExistingUsers] Создание роли "Внесение операций" для компании:',
          {
            companyId: company.id,
          }
        );

        operationsEditorRole = await prisma.role.create({
          data: {
            companyId: company.id,
            name: 'Внесение операций',
            description:
              'Возможность создавать и просматривать операции, а также просматривать справочники',
            category: 'Предустановленные',
            isSystem: false,
            isActive: true,
          },
        });

        // Получаем все существующие права роли "Внесение операций"
        const existingOperationsEditorPermissions =
          await prisma.rolePermission.findMany({
            where: {
              roleId: operationsEditorRole.id,
            },
          });

        // Создаём Set для быстрой проверки существующих прав
        const existingOperationsEditorPermissionsSet = new Set(
          existingOperationsEditorPermissions.map(
            (p) => `${p.entity}:${p.action}`
          )
        );

        // Создаем права для роли "Внесение операций"
        const operationsEditorPermissions = [];

        // Для операций: create и read
        const operationsPermissions = [
          { entity: 'operations', action: 'create' },
          { entity: 'operations', action: 'read' },
        ];

        // Для dashboard: read
        const dashboardPermission = { entity: 'dashboard', action: 'read' };

        // Для всех справочников (кроме администрирования): только read
        const catalogEntities = [
          'articles',
          'accounts',
          'counterparties',
          'departments',
          'deals',
        ];
        const catalogPermissions = catalogEntities.map((entityName) => ({
          entity: entityName,
          action: 'read' as const,
        }));

        // Для отчетов: только read (без export)
        const reportsPermission = {
          entity: 'reports',
          action: 'read' as const,
        };

        // Объединяем все права
        const allRequiredOperationsEditorPermissions = [
          ...operationsPermissions,
          dashboardPermission,
          ...catalogPermissions,
          reportsPermission,
        ];

        for (const perm of allRequiredOperationsEditorPermissions) {
          const permissionKey = `${perm.entity}:${perm.action}`;
          if (!existingOperationsEditorPermissionsSet.has(permissionKey)) {
            operationsEditorPermissions.push({
              roleId: operationsEditorRole.id,
              entity: perm.entity,
              action: perm.action,
              allowed: true,
            });
          }
        }

        if (operationsEditorPermissions.length > 0) {
          await prisma.rolePermission.createMany({
            data: operationsEditorPermissions,
            skipDuplicates: true,
          });
        }

        // Убеждаемся, что все права установлены в allowed: true
        await prisma.rolePermission.updateMany({
          where: {
            roleId: operationsEditorRole.id,
            allowed: false,
          },
          data: {
            allowed: true,
          },
        });

        totalRolesCreated += 1;
        logger.info(
          '[migrateExistingUsers] Создана роль "Внесение операций" с правами:',
          {
            roleId: operationsEditorRole.id,
            permissionsCount: operationsEditorPermissions.length,
          }
        );
      } else {
        // Обновляем права для существующей роли
        const existingOperationsEditorPermissions =
          await prisma.rolePermission.findMany({
            where: {
              roleId: operationsEditorRole.id,
            },
          });

        const existingOperationsEditorPermissionsSet = new Set(
          existingOperationsEditorPermissions.map(
            (p) => `${p.entity}:${p.action}`
          )
        );

        const operationsEditorPermissions = [];

        const operationsPermissions = [
          { entity: 'operations', action: 'create' },
          { entity: 'operations', action: 'read' },
        ];

        const dashboardPermission = { entity: 'dashboard', action: 'read' };

        const catalogEntities = [
          'articles',
          'accounts',
          'counterparties',
          'departments',
          'deals',
        ];
        const catalogPermissions = catalogEntities.map((entityName) => ({
          entity: entityName,
          action: 'read' as const,
        }));

        const reportsPermission = {
          entity: 'reports',
          action: 'read' as const,
        };

        const allRequiredOperationsEditorPermissions = [
          ...operationsPermissions,
          dashboardPermission,
          ...catalogPermissions,
          reportsPermission,
        ];

        for (const perm of allRequiredOperationsEditorPermissions) {
          const permissionKey = `${perm.entity}:${perm.action}`;
          if (!existingOperationsEditorPermissionsSet.has(permissionKey)) {
            operationsEditorPermissions.push({
              roleId: operationsEditorRole.id,
              entity: perm.entity,
              action: perm.action,
              allowed: true,
            });
          }
        }

        if (operationsEditorPermissions.length > 0) {
          await prisma.rolePermission.createMany({
            data: operationsEditorPermissions,
            skipDuplicates: true,
          });
        }

        await prisma.rolePermission.updateMany({
          where: {
            roleId: operationsEditorRole.id,
            allowed: false,
          },
          data: {
            allowed: true,
          },
        });
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

      // Назначаем роль "Внесение операций" остальным пользователям
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
          '[migrateExistingUsers] Назначена роль "Внесение операций" остальным пользователям:',
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
