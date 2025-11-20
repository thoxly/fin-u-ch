import { useState, useRef, useEffect } from 'react';
import { Settings, Edit, XCircle, X, Trash2 } from 'lucide-react';
import {
  useGetMappingRulesQuery,
  useDeleteMappingRuleMutation,
} from '../../store/api/importsApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { MappingRuleDialog } from './MappingRuleDialog';
import { Modal } from '../../shared/ui/Modal';
import type { MappingRule } from '@shared/types/imports';

export const MappingRules = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MappingRule | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useNotification();
  const isMobile = useIsMobile();

  const { data: rules = [], refetch } = useGetMappingRulesQuery();
  const [deleteRule] = useDeleteMappingRuleMutation();

  // Закрытие при клике вне (только для десктопной версии)
  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const handleEdit = (rule: MappingRule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRule(rule);
    setIsDialogOpen(true);
    setIsOpen(false);
  };

  const handleDelete = async (rule: MappingRule, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Удалить правило маппинга?')) {
      try {
        await deleteRule({ id: rule.id }).unwrap();
        showSuccess('Правило удалено');
        refetch();
      } catch (error) {
        showError('Ошибка при удалении правила');
      }
    }
  };

  const handleCreateNew = () => {
    setEditingRule(null);
    setIsDialogOpen(true);
    setIsOpen(false);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRule(null);
    refetch();
  };

  const getRuleTypeLabel = (ruleType: string) => {
    const labels: Record<string, string> = {
      contains: 'Содержит',
      equals: 'Совпадает',
      regex: 'Регулярное выражение',
      alias: 'Псевдоним',
    };
    return labels[ruleType] || ruleType;
  };

  const getSourceFieldLabel = (sourceField: string) => {
    const labels: Record<string, string> = {
      description: 'Назначение платежа',
      receiver: 'Имя получателя',
      payer: 'Имя плательщика',
      inn: 'ИНН',
    };
    return labels[sourceField] || sourceField;
  };

  const getTargetTypeLabel = (targetType: string) => {
    const labels: Record<string, string> = {
      article: 'Статья',
      counterparty: 'Контрагент',
      account: 'Счет',
      operationType: 'Тип операции',
    };
    return labels[targetType] || targetType;
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex items-center justify-center"
          title="Правила маппинга"
        >
          <Settings
            size={18}
            className="text-primary-600 dark:text-primary-400"
          />
          {rules.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-primary-600 dark:bg-primary-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {rules.length}
            </span>
          )}
        </button>

        {isOpen && (
          <>
            {isMobile ? (
              // Мобильная версия - полноэкранное модальное окно
              <div
                className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 flex items-end sm:items-center justify-center"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setIsOpen(false);
                  }
                }}
              >
                <div
                  className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col animate-slide-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Заголовок с кнопкой закрытия */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Правила маппинга
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreateNew}
                        className="p-2 text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Создать правило"
                      >
                        <Settings size={20} />
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Закрыть"
                      >
                        <X
                          size={20}
                          className="text-gray-500 dark:text-gray-400"
                        />
                      </button>
                    </div>
                  </div>

                  {/* Список правил */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {rules.length === 0 ? (
                      <div className="p-6 text-center">
                        <Settings
                          size={48}
                          className="mx-auto mb-4 text-gray-400 dark:text-gray-500"
                        />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Нет правил маппинга
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                          Правила маппинга автоматически заполняют операции при
                          импорте банковских выписок на основе текста в
                          назначении платежа, имени получателя или ИНН.
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                          Например, можно создать правило: если назначение
                          платежа содержит "Аренда", то автоматически выбирать
                          статью "Аренда" и контрагента "Арендодатель".
                        </p>
                        <button
                          onClick={handleCreateNew}
                          className="mt-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                        >
                          Создать первое правило
                        </button>
                      </div>
                    ) : (
                      rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                  {getRuleTypeLabel(rule.ruleType)}
                                </span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                  {getTargetTypeLabel(rule.targetType)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 break-words">
                                <strong>
                                  {getSourceFieldLabel(rule.sourceField)}:
                                </strong>{' '}
                                {rule.pattern}
                              </div>
                              {rule.targetName && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                  → {rule.targetName}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                Использовано: {rule.usageCount} раз
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={(e) => handleEdit(rule, e)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Редактировать"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(rule, e)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Удалить"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Десктопная версия - выпадающее меню
              <div className="absolute z-50 right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCreateNew}
                    className="w-full px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-2"
                  >
                    <Settings size={14} />
                    Создать правило
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {rules.length === 0 ? (
                    <div className="p-6 text-center">
                      <Settings
                        size={40}
                        className="mx-auto mb-3 text-gray-400 dark:text-gray-500"
                      />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Нет правил маппинга
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Правила маппинга автоматически заполняют операции при
                        импорте банковских выписок на основе текста в назначении
                        платежа, имени получателя или ИНН.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                        Например, можно создать правило: если назначение платежа
                        содержит "Аренда", то автоматически выбирать статью
                        "Аренда" и контрагента "Арендодатель".
                      </p>
                    </div>
                  ) : (
                    rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                {getRuleTypeLabel(rule.ruleType)}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                {getTargetTypeLabel(rule.targetType)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              <strong>
                                {getSourceFieldLabel(rule.sourceField)}:
                              </strong>{' '}
                              {rule.pattern}
                            </div>
                            {rule.targetName && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                → {rule.targetName}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                              Использовано: {rule.usageCount} раз
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => handleEdit(rule, e)}
                              className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title="Редактировать"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(rule, e)}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Модальное окно для создания/редактирования правила */}
      <Modal
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        title={editingRule ? 'Редактировать правило' : 'Создать правило'}
        size="md"
      >
        <MappingRuleDialog rule={editingRule} onClose={handleDialogClose} />
      </Modal>
    </>
  );
};
