import { ArticleForm } from '../../features/catalog-forms/index';
import { AccountForm } from '../../features/catalog-forms/index';
import { DepartmentForm } from '../../features/catalog-forms/index';
import { CounterpartyForm } from '../../features/catalog-forms/index';
import { DealForm } from '../../features/catalog-forms/index';

interface CatalogFormRendererProps {
  catalogType: string;
  onClose: () => void;
  editingData?: unknown; // Данные для редактирования
}

export const CatalogFormRenderer = ({
  catalogType,
  onClose,
  editingData,
}: CatalogFormRendererProps): JSX.Element => {
  const getFormComponent = (): JSX.Element => {
    switch (catalogType) {
      case 'Статьи':
        return <ArticleForm article={editingData || null} onClose={onClose} />;
      case 'Счета':
        return <AccountForm account={editingData || null} onClose={onClose} />;
      case 'Подразделения':
        return (
          <DepartmentForm department={editingData || null} onClose={onClose} />
        );
      case 'Контрагенты':
        return (
          <CounterpartyForm
            counterparty={editingData || null}
            onClose={onClose}
          />
        );
      case 'Сделки':
        return <DealForm deal={editingData || null} onClose={onClose} />;
      default:
        return (
          <div className="p-4 text-gray-600 dark:text-gray-400">
            Форма для &quot;{catalogType}&quot; недоступна
          </div>
        );
    }
  };

  return getFormComponent();
};
