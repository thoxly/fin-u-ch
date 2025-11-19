import { ArticleForm } from '../../features/catalog-forms/index';
import { AccountForm } from '../../features/catalog-forms/index';
import { DepartmentForm } from '../../features/catalog-forms/index';
import { CounterpartyForm } from '../../features/catalog-forms/index';
import { DealForm } from '../../features/catalog-forms/index';
import { SalaryForm } from '../../features/catalog-forms/index';
import type {
  Article,
  Account,
  Department,
  Counterparty,
  Deal,
  Salary,
} from '@fin-u-ch/shared';

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
        return (
          <ArticleForm
            article={(editingData as Article | null) ?? null}
            onClose={onClose}
          />
        );
      case 'Счета':
        return (
          <AccountForm
            account={(editingData as Account | null) ?? null}
            onClose={onClose}
          />
        );
      case 'Подразделения':
        return (
          <DepartmentForm
            department={(editingData as Department | null) ?? null}
            onClose={onClose}
          />
        );
      case 'Контрагенты':
        return (
          <CounterpartyForm
            counterparty={(editingData as Counterparty | null) ?? null}
            onClose={onClose}
          />
        );
      case 'Сделки':
        return (
          <DealForm
            deal={(editingData as Deal | null) ?? null}
            onClose={onClose}
          />
        );
      case 'Зарплаты':
        return (
          <SalaryForm
            salary={(editingData as Salary | null) ?? null}
            onClose={onClose}
          />
        );
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
