import { ArticleForm } from '../../pages/catalogs/ArticlesPage';
import { AccountForm } from '../../pages/catalogs/AccountsPage';
import { DepartmentForm } from '../../pages/catalogs/DepartmentsPage';
import { CounterpartyForm } from '../../pages/catalogs/CounterpartiesPage';
import { DealForm } from '../../pages/catalogs/DealsPage';
import { SalaryForm } from '../../pages/catalogs/SalariesPage';

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
