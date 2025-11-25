import { useState } from 'react';
import { Trash2, Eye, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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
import { ImportMappingTable } from './ImportMappingTable';
import TableSkeleton from '../../shared/ui/TableSkeleton';
import { EmptyState } from '../../shared/ui/EmptyState';

interface ImportHistoryProps {
  onClose?: () => void;
  onViewingChange?: (isViewing: boolean) => void;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  onViewSession?: (sessionId: string) => void;
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
  isCollapsed = false,
  onCollapseChange,
  onViewSession,
  viewingSessionId: propViewingSessionId,
}: ImportHistoryProps) => {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [internalViewingSessionId, setInternalViewingSessionId] = useState<
    string | null
  >(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
  }>({
    isOpen: false,
    sessionId: null,
  });

  const viewingSessionId = propViewingSessionId ?? internalViewingSessionId;

  const limit = 20;

  const { data, isLoading, refetch } = useGetImportSessionsQuery({
    status: statusFilter || undefined,
    limit,
    offset: page * limit,
  });

  const [deleteSession, { isLoading: isDeleting }] = useDeleteSessionMutation();
  const { showSuccess, showError } = useNotification();

  const sessions = data?.sessions || [];
  const total = data?.total || 0;

  const handleView = (sessionId: string) => {
    if (onViewSession) {
      onViewSession(sessionId);
    } else {
      setInternalViewingSessionId(sessionId);
      onViewingChange?.(true);
    }
  };

  const handleDelete = (sessionId: string) => {
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

  const handleCloseView = () => {
    if (onViewSession) {
      onViewSession('');
    } else {
      setInternalViewingSessionId(null);
    }
    onViewingChange?.(false);
    refetch();
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
      width: '130px',
    },
    {
      key: 'counts',
      header: 'Операции',
      render: (session: ImportSession) => (
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
          <div>
            Всего: <span className="font-medium">{session.importedCount}</span>
          </div>
          <div>
            Подтверждено:{' '}
            <span className="font-medium">{session.confirmedCount}</span>
          </div>
          <div>
            Обработано:{' '}
            <span className="font-medium">{session.processedCount}</span>
          </div>
        </div>
      ),
      width: '150px',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (session: ImportSession) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleView(session.id);
            }}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            title="Просмотр"
          >
            <Eye size={16} />
          </button>
          {session.status !== 'processed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(session.id);
              }}
              className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
      width: '100px',
    },
  ];

  const totalPages = Math.ceil(total / limit);

  // Если открыт просмотр сессии, показываем таблицу маппинга
  if (viewingSessionId) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Импортированные операции</h2>
          <Button onClick={handleCloseView} variant="secondary" size="sm">
            Назад к истории
          </Button>
        </div>
        <ImportMappingTable
          sessionId={viewingSessionId}
          onClose={handleCloseView}
          isCollapsed={false}
          onCollapseChange={undefined}
        />
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText
              size={20}
              className="text-primary-600 dark:text-primary-400"
            />
            <h3 className="text-lg font-semibold">История импортов</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCollapseChange?.(false)}
              className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Развернуть"
            >
              <ChevronUp size={20} />
            </button>
            {onClose && (
              <Button onClick={onClose} variant="secondary" size="sm">
                Закрыть
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          История импортов свернута. Нажмите, чтобы развернуть.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">История импортов</h2>
          {onCollapseChange && (
            <button
              onClick={() => onCollapseChange(true)}
              className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Свернуть"
            >
              <ChevronDown size={20} />
            </button>
          )}
        </div>
        {onClose && (
          <Button onClick={onClose} variant="secondary" size="sm">
            Закрыть
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
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
          placeholder="Фильтр по статусу"
          className="w-48"
        />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Всего: <span className="font-medium">{total}</span>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
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
              />
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Страница {page + 1} из {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  variant="secondary"
                  size="sm"
                >
                  Назад
                </Button>
                <Button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  variant="secondary"
                  size="sm"
                >
                  Вперед
                </Button>
              </div>
            </div>
          )}
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
