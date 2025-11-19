import { useState } from 'react';
import { Trash2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Select } from '../../shared/ui/Select';
import { ConfirmDeleteModal } from '../../shared/ui/ConfirmDeleteModal';
import {
  useGetImportSessionsQuery,
  useDeleteSessionMutation,
} from '../../store/api/importsApi';
import { formatDate } from '../../shared/lib/date';
import { useNotification } from '../../shared/hooks/useNotification';
import type { ImportSession } from '@shared/types/imports';
import TableSkeleton from '../../shared/ui/TableSkeleton';
import { EmptyState } from '../../shared/ui/EmptyState';
import { DateRangePicker } from '../../shared/ui/DateRangePicker';

interface ImportHistoryProps {
  onClose?: () => void;
  onViewingChange?: (isViewing: boolean) => void;
  onViewSession?: (sessionId: string, fileName?: string) => void;
  viewingSessionId?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждено',
  processed: 'Обработано',
  canceled: 'Отменено',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  processed:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const ImportHistory = ({
  onClose,
  onViewingChange,
  onViewSession,
  viewingSessionId: propViewingSessionId,
}: ImportHistoryProps) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
  }>({
    isOpen: false,
    sessionId: null,
  });

  const { data, isLoading, refetch } = useGetImportSessionsQuery({
    status: statusFilter || undefined,
    limit: pageSize,
    offset: page * pageSize,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
  });

  const [deleteSession, { isLoading: isDeleting }] = useDeleteSessionMutation();
  const { showSuccess, showError } = useNotification();

  const sessions = data?.sessions || [];
  const total = data?.total || 0;

  const handleRowClick = (session: ImportSession) => {
    if (onViewSession) {
      onViewSession(session.id, session.fileName);
      onViewingChange?.(true);
    }
  };

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, sessionId });
  };

  const confirmDelete = async () => {
    if (!deleteModal.sessionId) return;
    try {
      await deleteSession({ sessionId: deleteModal.sessionId }).unwrap();
      showSuccess('Сессия импорта успешно удалена');
      await refetch();
      setDeleteModal({ isOpen: false, sessionId: null });
    } catch (error) {
      console.error('Failed to delete session:', error);
      showError('Ошибка при удалении сессии импорта');
    }
  };

  const columns = [
    {
      key: 'createdAt',
      header: 'Дата создания',
      render: (session: ImportSession) => formatDate(session.createdAt),
      width: '150px',
    },
    {
      key: 'fileName',
      header: 'Имя файла',
      render: (session: ImportSession) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          <span className="truncate max-w-xs">{session.fileName}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (session: ImportSession) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[session.status] || STATUS_COLORS.draft}`}
        >
          {STATUS_LABELS[session.status] || session.status}
        </span>
      ),
      width: '120px',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (session: ImportSession) =>
        session.status !== 'processed' ? (
          <button
            onClick={(e) => handleDelete(session.id, e)}
            className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            title="Удалить"
          >
            <Trash2 size={16} />
          </button>
        ) : null,
      width: '80px',
    },
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4 flex-nowrap">
        <DateRangePicker
          startDate={dateFrom}
          endDate={dateTo}
          onChange={(start, end) => {
            setDateFrom(start);
            setDateTo(end);
            setPage(0);
          }}
          placeholder="Период"
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
          options={[
            { value: '', label: 'Все статусы' },
            { value: 'draft', label: 'Черновик' },
            { value: 'confirmed', label: 'Подтверждено' },
            { value: 'processed', label: 'Обработано' },
            { value: 'canceled', label: 'Отменено' },
          ]}
          placeholder="Статус"
          className="w-36"
        />
        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          Всего: <span className="font-medium">{total}</span>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Нет импортов"
          description="История импортов пуста. Загрузите первую выписку, чтобы начать."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="[&_.table_th]:px-3 [&_.table_th]:py-2 [&_.table_td]:px-3 [&_.table_td]:py-2 [&_.table_th]:text-xs [&_.table_td]:text-xs">
              <Table
                columns={columns}
                data={sessions}
                keyExtractor={(session) => session.id}
                onRowClick={handleRowClick}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Страница
              </span>
              <Select
                value={pageSize.toString()}
                onChange={(value) => {
                  setPageSize(Number(value));
                  setPage(0);
                }}
                options={[
                  { value: '5', label: '5' },
                  { value: '10', label: '10' },
                  { value: '50', label: '50' },
                ]}
                className="w-20"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap min-w-fit">
                из {totalPages}
              </span>
            </div>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  variant="secondary"
                  size="sm"
                  title="Предыдущая страница"
                >
                  <ChevronLeft size={20} />
                </Button>
                <Button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  variant="secondary"
                  size="sm"
                  title="Следующая страница"
                >
                  <ChevronRight size={20} />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, sessionId: null })}
        onConfirm={confirmDelete}
        title="Подтверждение удаления"
        message="Вы уверены, что хотите удалить эту сессию импорта? Все связанные черновики операций будут удалены."
        confirmText="Удалить"
        variant="delete"
        isLoading={isDeleting}
      />
    </div>
  );
};
