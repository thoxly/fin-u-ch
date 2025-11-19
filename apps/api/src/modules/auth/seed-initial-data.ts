import { PrismaClient } from '@prisma/client';
import logger from '../../config/logger';

/**
 * Создает начальные данные для новой компании
 * Вызывается при регистрации
 */
export async function seedInitialData(
  tx: PrismaClient,
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

  // 6. СИСТЕМНЫЕ РОЛИ И ПРАВА
  logger.debug('Starting creation of system roles', {
    companyId,
    firstUserId,
  });

  // Определяем все сущности и действия согласно ТЗ
  // ВАЖНО: При добавлении новых сущностей/действий, обязательно добавляйте их сюда
  const entities = [
    {
      name: 'articles',
      actions: ['create', 'read', 'update', 'delete', 'archive', 'restore'],
    },
    { name: 'accounts', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'departments', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'counterparties', actions: ['create', 'read', 'update', 'delete'] },
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

  // Создаем роль "По умолчанию"
  const defaultRole = await tx.role.create({
    data: {
      companyId,
      name: 'По умолчанию',
      description: 'Системная роль с минимальными правами (только просмотр)',
      category: 'Системные',
      isSystem: true,
      isActive: true,
    },
  });

  logger.debug('Created "Default" role', {
    roleId: defaultRole.id,
    companyId,
    name: defaultRole.name,
    isSystem: defaultRole.isSystem,
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

  await tx.rolePermission.createMany({
    data: defaultPermissions,
  });

  logger.debug('Created permissions for "Default" role', {
    roleId: defaultRole.id,
    permissionsCount: defaultPermissions.length,
    permissions: defaultPermissions.map((p) => `${p.entity}:${p.action}`),
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
    rolesCreated: 2,
    superAdminRoleId: superAdminRole.id,
    defaultRoleId: defaultRole.id,
    firstUserId,
  });
}
