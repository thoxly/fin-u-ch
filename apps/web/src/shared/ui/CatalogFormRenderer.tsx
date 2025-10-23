import { ArticleForm } from '../../features/catalog-forms/index';
import { AccountForm } from '../../features/catalog-forms/index';
import { DepartmentForm } from '../../features/catalog-forms/index';
import { CounterpartyForm } from '../../features/catalog-forms/index';
import { DealForm } from '../../features/catalog-forms/index';
import { SalaryForm } from '../../features/catalog-forms/index';

interface CatalogFormRendererProps {
  catalogType: string;
  onClose: () => void;
}

export const CatalogFormRenderer = ({
  catalogType,
  onClose,
}: CatalogFormRendererProps): JSX.Element => {
  const getFormComponent = (): JSX.Element => {
    switch (catalogType) {
      case 'Статьи':
        return <ArticleForm article={null} onClose={onClose} />;
      case 'Счета':
        return <AccountForm account={null} onClose={onClose} />;
      case 'Подразделения':
        return <DepartmentForm department={null} onClose={onClose} />;
      case 'Контрагенты':
        return <CounterpartyForm counterparty={null} onClose={onClose} />;
      case 'Сделки':
        return <DealForm deal={null} onClose={onClose} />;
      case 'Зарплаты':
        return <SalaryForm salary={null} onClose={onClose} />;
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
