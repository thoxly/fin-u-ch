import { useState } from 'react';
import { AdminLayout } from '../../shared/ui/AdminLayout';
import { Card } from '../../shared/ui/Card';
import { Table } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { useGetAuditLogsQuery } from '../../store/api/auditLogApi';
import { formatDateTime } from '../../shared/lib/date';
import { usePermissions } from '../../shared/hooks/usePermissions';
import {
  FileText,
  User,
  Calendar,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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

const getActionBadgeClasses = (action: string): string => {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  const colorMap: Record<string, string> = {
    create:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    archive:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    restore:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    confirm:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    assign_role:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    remove_role:
      'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    update_permissions:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };

  const colors =
    colorMap[action] ||
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  return `${baseClasses} ${colors}`;
};

const getEntityBadgeClasses = (entity: string): string => {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  const colorMap: Record<string, string> = {
    operation:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    budget:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    plan: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    article:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    account:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    department:
      'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    counterparty:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    deal: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    salary: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    role: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    user: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  const colors =
    colorMap[entity] ||
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  return `${baseClasses} ${colors}`;
};

export const AuditLogsPage = () => {
  const { canRead } = usePermissions();

  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);

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

  const handleLimitChange = (newLimit: string) => {
    setLimit(Number(newLimit));
    setPage(0); // Сбрасываем страницу при изменении лимита
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const getPageNumbers = () => {
    const currentPage = page + 1;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Если страниц мало, показываем все
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Всегда показываем первую страницу
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Показываем страницы вокруг текущей
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Всегда показываем последнюю страницу
      pages.push(totalPages);
    }

    return pages;
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
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Журнал действий
          </h1>
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>У вас нет прав для просмотра журнала действий</p>
            </div>
          </Card>
        </div>
      </AdminLayout>
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
        <span className={getActionBadgeClasses(log.action)}>
          {getActionLabel(log.action)}
        </span>
      ),
      width: '150px',
    },
    {
      key: 'entity',
      header: 'Сущность',
      render: (log: AuditLog) => (
        <span className={getEntityBadgeClasses(log.entity)}>
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
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Журнал действий
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              История всех действий пользователей в системе
            </p>
          </div>
        </div>

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
                onChange={(value) => handleFilterChange('entity', value)}
                options={ENTITY_OPTIONS}
              />

              <Select
                label="Действие"
                value={filters.action}
                onChange={(value) => handleFilterChange('action', value)}
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
                    Всего записей:{' '}
                    <strong className="text-gray-900 dark:text-gray-100">
                      {data?.total || 0}
                    </strong>
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
              {totalPages > 0 && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Выбор количества записей */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Записей на странице:
                      </span>
                      <Select
                        value={String(limit)}
                        onChange={handleLimitChange}
                        options={[
                          { value: '25', label: '25' },
                          { value: '50', label: '50' },
                          { value: '100', label: '100' },
                        ]}
                        className="w-20"
                      />
                    </div>

                    {/* Навигация по страницам */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="hidden sm:inline">Назад</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          {getPageNumbers().map((pageNum, index) => {
                            if (pageNum === '...') {
                              return (
                                <span
                                  key={`ellipsis-${index}`}
                                  className="px-2 text-gray-500 dark:text-gray-400"
                                >
                                  ...
                                </span>
                              );
                            }

                            const pageIndex = (pageNum as number) - 1;
                            const isActive = pageIndex === page;

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageIndex)}
                                disabled={isActive}
                                className={`
                                  min-w-[2.5rem] px-3 py-1.5 text-sm font-medium rounded-md
                                  transition-colors
                                  ${
                                    isActive
                                      ? 'bg-primary-600 text-white dark:bg-primary-500'
                                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }
                                  disabled:cursor-default
                                `}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setPage((p) => Math.min(totalPages - 1, p + 1))
                          }
                          disabled={page >= totalPages - 1}
                          className="flex items-center gap-1"
                        >
                          <span className="hidden sm:inline">Вперёд</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Информация о записях */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {data && data.total > 0 ? (
                        <span>
                          Показано {page * limit + 1} -{' '}
                          {Math.min((page + 1) * limit, data.total)} из{' '}
                          {data.total}
                        </span>
                      ) : (
                        <span>Нет записей</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};
