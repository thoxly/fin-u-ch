import { PrismaClient } from '@prisma/client';
import logger from '../../config/logger';
import { ENTITIES_CONFIG } from '../roles/config/entities.config';

/**
 * Тип для транзакционного клиента Prisma
 */
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Создает начальные данные для новой компании
 * Вызывается при регистрации
 */
export async function seedInitialData(
  tx: PrismaTransactionClient,
  companyId: string,
  firstUserId?: string
): Promise<void> {
  // 1. СЧЕТА
  const accounts = await tx.account.createMany({
    data: [
      {
        companyId,
        name: 'Расчетный счет в банке',
        number: null,
        currency: 'RUB',
        openingBalance: 0,
        isActive: true,
      },
      {
        companyId,
        name: 'Касса',
        number: null,
        currency: 'RUB',
        openingBalance: 0,
        isActive: true,
      },
      {
        companyId,
        name: 'Корпоративная карта',
        number: null,
        currency: 'RUB',
        openingBalance: 0,
        isActive: true,
      },
    ],
  });

  // 2. СТАТЬИ - только ключевые (5-6 статей)
  await tx.article.createMany({
    data: [
      {
        companyId,
        name: 'Выручка от продаж',
        type: 'income',
        activity: 'operating',
        isActive: true,
      },
      {
        companyId,
        name: 'Зарплата',
        type: 'expense',
        activity: 'operating',
        isActive: true,
      },
      {
        companyId,
        name: 'Аренда офиса',
        type: 'expense',
        activity: 'operating',
        isActive: true,
      },
      {
        companyId,
        name: 'Налоги',
        type: 'expense',
        activity: 'operating',
        isActive: true,
      },
      {
        companyId,
        name: 'Покупка оборудования',
        type: 'expense',
        activity: 'investing',
        isActive: true,
      },
      {
        companyId,
        name: 'Проценты по кредитам',
        type: 'expense',
        activity: 'financing',
        isActive: true,
      },
    ],
  });

  // 3. ПОДРАЗДЕЛЕНИЯ - минимальный набор
  await tx.department.createMany({
    data: [
      {
        companyId,
        name: 'Основное подразделение',
        description: null,
      },
    ],
  });

  // 4. КОНТРАГЕНТЫ - минимальный набор
  await tx.counterparty.createMany({
    data: [
      {
        companyId,
        name: 'Общий контрагент',
        category: 'other',
        inn: null,
        description: null,
      },
    ],
  });

  // 5. СДЕЛКИ - минимальный набор
  const createdDepartments = await tx.department.findMany({
    where: { companyId },
    take: 1,
  });
  const createdCounterparties = await tx.counterparty.findMany({
    where: { companyId },
    take: 1,
  });

  if (createdDepartments.length > 0 && createdCounterparties.length > 0) {
    await tx.deal.createMany({
      data: [
        {
          companyId,
          name: 'Общая сделка',
          departmentId: createdDepartments[0].id,
          counterpartyId: createdCounterparties[0].id,
          amount: null,
          description: null,
        },
      ],
    });
  }

  // 6. РОЛИ И ПРАВА
  logger.debug('Starting creation of roles', {
    companyId,
    firstUserId,
  });

  // Используем централизованную конфигурацию сущностей
  // При добавлении новой сущности обновите только config/entities.config.ts
  const entities = Object.values(ENTITIES_CONFIG).map((entity) => ({
    name: entity.name,
    actions: entity.actions,
  }));

  // Проверяем, существует ли уже роль "Супер-пользователь"
  let superAdminRole = await tx.role.findFirst({
    where: {
      companyId,
      name: 'Супер-пользователь',
      isSystem: true,
    },
  });

  // Создаем или обновляем роль "Супер-пользователь"
  if (!superAdminRole) {
    superAdminRole = await tx.role.create({
      data: {
        companyId,
        name: 'Супер-пользователь',
        description:
          'Системная роль с полными правами доступа ко всем функциям системы',
        category: 'Системные',
        isSystem: true,
        isActive: true,
      },
    });

    logger.debug('Created "Super Admin" role', {
      roleId: superAdminRole.id,
      companyId,
      name: superAdminRole.name,
      isSystem: superAdminRole.isSystem,
    });
  } else {
    logger.debug('"Super Admin" role already exists, updating permissions', {
      roleId: superAdminRole.id,
      companyId,
    });
  }

  // Получаем все существующие права роли "Супер-пользователь"
  const existingPermissions = await tx.rolePermission.findMany({
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
    await tx.rolePermission.createMany({
      data: allRequiredPermissions,
      skipDuplicates: true,
    });

    logger.debug('Added missing permissions for "Super Admin" role', {
      roleId: superAdminRole.id,
      addedCount: allRequiredPermissions.length,
      addedPermissions: allRequiredPermissions.map(
        (p) => `${p.entity}:${p.action}`
      ),
    });
  }

  // Убеждаемся, что все права установлены в allowed: true (на случай, если были изменены)
  await tx.rolePermission.updateMany({
    where: {
      roleId: superAdminRole.id,
      allowed: false,
    },
    data: {
      allowed: true,
    },
  });

  // Получаем финальный список всех прав для логирования
  const finalPermissions = await tx.rolePermission.findMany({
    where: {
      roleId: superAdminRole.id,
    },
  });

  logger.debug('Final permissions for "Super Admin" role', {
    roleId: superAdminRole.id,
    totalPermissionsCount: finalPermissions.length,
    permissions: finalPermissions.map((p) => `${p.entity}:${p.action}`),
  });

  // =========================================================
  // 7. ПРЕДУСТАНОВЛЕННЫЕ РОЛИ (не системные, можно редактировать)
  // =========================================================

  // 7.1. Роль "Полный доступ" - все права кроме администрирования
  let fullAccessRole = await tx.role.findFirst({
    where: {
      companyId,
      name: 'Полный доступ',
      category: 'Предустановленные',
    },
  });

  if (!fullAccessRole) {
    fullAccessRole = await tx.role.create({
      data: {
        companyId,
        name: 'Полный доступ',
        description:
          'Полный доступ ко всем функциям системы кроме управления пользователями и ролями',
        category: 'Предустановленные',
        isSystem: false,
        isActive: true,
      },
    });

    logger.debug('Created "Full Access" role', {
      roleId: fullAccessRole.id,
      companyId,
      name: fullAccessRole.name,
      isSystem: fullAccessRole.isSystem,
    });
  } else {
    logger.debug('"Full Access" role already exists, updating permissions', {
      roleId: fullAccessRole.id,
      companyId,
    });
  }

  // Получаем все существующие права роли "Полный доступ"
  const existingFullAccessPermissions = await tx.rolePermission.findMany({
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
    await tx.rolePermission.createMany({
      data: fullAccessPermissions,
      skipDuplicates: true,
    });
  }

  // Убеждаемся, что все права установлены в allowed: true
  await tx.rolePermission.updateMany({
    where: {
      roleId: fullAccessRole.id,
      allowed: false,
    },
    data: {
      allowed: true,
    },
  });

  logger.debug('Updated permissions for "Full Access" role', {
    roleId: fullAccessRole.id,
    addedCount: fullAccessPermissions.length,
    permissions: fullAccessPermissions.map((p) => `${p.entity}:${p.action}`),
  });

  // 7.2. Роль "Внесение операций" - создание операций + просмотр справочников
  let operationsEditorRole = await tx.role.findFirst({
    where: {
      companyId,
      name: 'Внесение операций',
      category: 'Предустановленные',
    },
  });

  // Если роль с названием "Добавление операций" существует, переименовываем её
  if (!operationsEditorRole) {
    const oldOperationsEditorRole = await tx.role.findFirst({
      where: {
        companyId,
        name: 'Добавление операций',
        category: 'Предустановленные',
      },
    });

    if (oldOperationsEditorRole) {
      operationsEditorRole = await tx.role.update({
        where: { id: oldOperationsEditorRole.id },
        data: {
          name: 'Внесение операций',
        },
      });
      logger.debug('Renamed "Добавление операций" to "Внесение операций"', {
        roleId: operationsEditorRole.id,
        companyId,
      });
    }
  }

  if (!operationsEditorRole) {
    operationsEditorRole = await tx.role.create({
      data: {
        companyId,
        name: 'Внесение операций',
        description:
          'Возможность создавать и просматривать операции, а также просматривать справочники',
        category: 'Предустановленные',
        isSystem: false,
        isActive: true,
      },
    });

    logger.debug('Created "Operations Editor" role', {
      roleId: operationsEditorRole.id,
      companyId,
      name: operationsEditorRole.name,
      isSystem: operationsEditorRole.isSystem,
    });
  } else {
    logger.debug(
      '"Operations Editor" role already exists, updating permissions',
      {
        roleId: operationsEditorRole.id,
        companyId,
      }
    );
  }

  // Получаем все существующие права роли "Внесение операций"
  const existingOperationsEditorPermissions = await tx.rolePermission.findMany({
    where: {
      roleId: operationsEditorRole.id,
    },
  });

  // Создаём Set для быстрой проверки существующих прав
  const existingOperationsEditorPermissionsSet = new Set(
    existingOperationsEditorPermissions.map((p) => `${p.entity}:${p.action}`)
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
  const reportsPermission = { entity: 'reports', action: 'read' as const };

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
    await tx.rolePermission.createMany({
      data: operationsEditorPermissions,
      skipDuplicates: true,
    });
  }

  // Убеждаемся, что все права установлены в allowed: true
  await tx.rolePermission.updateMany({
    where: {
      roleId: operationsEditorRole.id,
      allowed: false,
    },
    data: {
      allowed: true,
    },
  });

  logger.debug('Updated permissions for "Operations Editor" role', {
    roleId: operationsEditorRole.id,
    addedCount: operationsEditorPermissions.length,
    permissions: operationsEditorPermissions.map(
      (p) => `${p.entity}:${p.action}`
    ),
  });

  // Назначаем роль "Супер-пользователь" первому пользователю, если он передан
  if (firstUserId) {
    const userRole = await tx.userRole.create({
      data: {
        userId: firstUserId,
        roleId: superAdminRole.id,
        assignedBy: null, // Системное назначение
      },
    });

    logger.debug('"Super Admin" role assigned to first user', {
      userRoleId: userRole.id,
      userId: firstUserId,
      roleId: superAdminRole.id,
      roleName: superAdminRole.name,
      assignedAt: userRole.assignedAt,
    });
  } else {
    logger.debug('firstUserId not provided, role not assigned to user');
  }

  logger.info('Initial data seeded successfully', {
    companyId,
    accounts: accounts.count,
    rolesCreated: 3,
    superAdminRoleId: superAdminRole.id,
    fullAccessRoleId: fullAccessRole.id,
    operationsEditorRoleId: operationsEditorRole.id,
    firstUserId,
  });
}
