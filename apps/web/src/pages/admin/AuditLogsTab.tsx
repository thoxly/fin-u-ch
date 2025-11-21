import { useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Table } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { useGetAuditLogsQuery } from '../../store/api/auditLogApi';
import { formatDateTime } from '../../shared/lib/date';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { FileText, User, Calendar, Filter, X } from 'lucide-react';
import type { AuditLog } from '../../store/api/auditLogApi';

const ENTITY_OPTIONS = [
  { value: '', label: 'Все сущности' },
  { value: 'operation', label: 'Операции' },
  { value: 'budget', label: 'Бюджеты' },
  { value: 'plan', label: 'Планы' },
  { value: 'article', label: 'Статьи' },
  { value: 'account', label: 'Счета' },
  { value: 'department', label: 'Подразделения' },
  { value: 'counterparty', label: 'Контрагенты' },
  { value: 'deal', label: 'Сделки' },
  { value: 'salary', label: 'Зарплаты' },
  { value: 'role', label: 'Роли' },
  { value: 'user', label: 'Пользователи' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Все действия' },
  { value: 'create', label: 'Создание' },
  { value: 'update', label: 'Обновление' },
  { value: 'delete', label: 'Удаление' },
  { value: 'archive', label: 'Архивирование' },
  { value: 'restore', label: 'Восстановление' },
  { value: 'confirm', label: 'Подтверждение' },
  { value: 'assign_role', label: 'Назначение роли' },
  { value: 'remove_role', label: 'Снятие роли' },
  { value: 'update_permissions', label: 'Обновление прав' },
];

const getActionLabel = (action: string): string => {
  const option = ACTION_OPTIONS.find((opt) => opt.value === action);
  return option?.label || action;
};

const getEntityLabel = (entity: string): string => {
  const option = ENTITY_OPTIONS.find((opt) => opt.value === entity);
  return option?.label || entity;
};

export const AuditLogsTab = () => {
  const { canRead } = usePermissions();

  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });

  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, error } = useGetAuditLogsQuery({
    entity: filters.entity || undefined,
    action: filters.action || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    limit,
    offset: page * limit,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0); // Сбрасываем страницу при изменении фильтров
  };

  const clearFilters = () => {
    setFilters({
      entity: '',
      action: '',
      dateFrom: '',
      dateTo: '',
    });
    setPage(0);
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  if (!canRead('audit')) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>У вас нет прав для просмотра журнала действий</p>
        </div>
      </Card>
    );
  }

  const columns = [
    {
      key: 'createdAt',
      header: 'Дата и время',
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{formatDateTime(log.createdAt)}</span>
        </div>
      ),
      width: '180px',
    },
    {
      key: 'user',
      header: 'Пользователь',
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {log.user.firstName && log.user.lastName
                ? `${log.user.firstName} ${log.user.lastName}`
                : log.user.email}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {log.user.email}
            </div>
          </div>
        </div>
      ),
      width: '200px',
    },
    {
      key: 'action',
      header: 'Действие',
      render: (log: AuditLog) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          {getActionLabel(log.action)}
        </span>
      ),
      width: '150px',
    },
    {
      key: 'entity',
      header: 'Сущность',
      render: (log: AuditLog) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          {getEntityLabel(log.entity)}
        </span>
      ),
      width: '150px',
    },
    {
      key: 'entityId',
      header: 'ID записи',
      render: (log: AuditLog) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {log.entityId.substring(0, 8)}...
        </code>
      ),
      width: '120px',
    },
    {
      key: 'metadata',
      header: 'Доп. информация',
      render: (log: AuditLog) => {
        const metadata = log.metadata || {};
        return (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {metadata.ip && <div>IP: {metadata.ip}</div>}
            {metadata.bulk && (
              <div className="text-orange-600 dark:text-orange-400">
                Массовая операция
              </div>
            )}
          </div>
        );
      },
    },
  ];

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Фильтры */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Фильтры
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Сущность"
              value={filters.entity}
              onChange={(e) => handleFilterChange('entity', e.target.value)}
              options={ENTITY_OPTIONS}
            />

            <Select
              label="Действие"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              options={ACTION_OPTIONS}
            />

            <Input
              label="Дата от"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />

            <Input
              label="Дата до"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Очистить фильтры
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Таблица логов */}
      <Card>
        {error ? (
          <div className="text-center py-8 text-red-600 dark:text-red-400">
            Ошибка загрузки журнала действий
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileText className="w-4 h-4" />
                <span>
                  Всего записей: {data?.total || 0}
                  {data && data.total > limit && (
                    <span className="ml-2">
                      (показано {page * limit + 1} -{' '}
                      {Math.min((page + 1) * limit, data.total)})
                    </span>
                  )}
                </span>
              </div>
            </div>

            <Table
              columns={columns}
              data={data?.logs || []}
              keyExtractor={(log) => log.id}
              loading={isLoading}
              emptyMessage="Нет записей в журнале действий"
            />

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-full sm:w-auto"
                >
                  Назад
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Страница {page + 1} из {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="w-full sm:w-auto"
                >
                  Вперёд
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
