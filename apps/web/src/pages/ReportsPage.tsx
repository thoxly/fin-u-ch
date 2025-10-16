import { useState } from 'react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Input } from '../shared/ui/Input';
// import { Button } from '../shared/ui/Button';
import {
  useGetCashflowReportQuery,
  useGetBddsReportQuery,
  useGetPlanFactReportQuery,
  useGetDdsReportQuery,
} from '../store/api/reportsApi';
import { formatMoney } from '../shared/lib/money';
import { toISODate } from '../shared/lib/date';
import { subMonths, startOfMonth } from 'date-fns';

type TabType = 'cashflow' | 'bdds' | 'planfact' | 'dds';

export const ReportsPage = () => {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<TabType>('cashflow');
  const [periodFrom, setPeriodFrom] = useState(
    toISODate(startOfMonth(subMonths(today, 2)))
  );
  const [periodTo, setPeriodTo] = useState(toISODate(today));

  const tabs = [
    { id: 'cashflow' as TabType, label: 'ОДДС (факт)' },
    { id: 'bdds' as TabType, label: 'БДДС (план)' },
    { id: 'planfact' as TabType, label: 'План vs Факт' },
    { id: 'dds' as TabType, label: 'ДДС (детально)' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Отчеты</h1>

        {/* Фильтры */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Период с"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
            <Input
              label="Период по"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
          </div>
        </Card>

        {/* Вкладки */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'cashflow' && (
          <CashflowTab periodFrom={periodFrom} periodTo={periodTo} />
        )}
        {activeTab === 'bdds' && (
          <BddsTab periodFrom={periodFrom} periodTo={periodTo} />
        )}
        {activeTab === 'planfact' && (
          <PlanFactTab periodFrom={periodFrom} periodTo={periodTo} />
        )}
        {activeTab === 'dds' && (
          <DDSTab periodFrom={periodFrom} periodTo={periodTo} />
        )}
      </div>
    </Layout>
  );
};

// ОДДС (факт)
const CashflowTab = ({
  periodFrom,
  periodTo,
}: {
  periodFrom: string;
  periodTo: string;
}) => {
  const { data, isLoading, error } = useGetCashflowReportQuery({
    periodFrom,
    periodTo,
  });

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-red-600">Ошибка загрузки отчета</div>
      </Card>
    );
  }

  if (!data || !data.activities || data.activities.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">
          Нет данных за выбранный период
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-8">
        {data.activities.map((group) => (
          <div key={group.activity}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold capitalize">
                {group.activity}
              </h3>
              <div className="text-sm text-gray-600">
                Итого: {formatMoney(group.netCashflow)}
              </div>
            </div>
            {/* Поступления */}
            {group.incomeGroups.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th colSpan={2} className="text-left text-green-700">
                        Поступления (Итого: {formatMoney(group.totalIncome)})
                      </th>
                    </tr>
                    <tr>
                      <th>Статья</th>
                      <th className="text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.incomeGroups.map((row) => (
                      <tr key={row.articleId}>
                        <td>{row.articleName}</td>
                        <td className="text-right">{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Выбытия */}
            {group.expenseGroups.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th colSpan={2} className="text-left text-red-700">
                        Выбытия (Итого: {formatMoney(group.totalExpense)})
                      </th>
                    </tr>
                    <tr>
                      <th>Статья</th>
                      <th className="text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.expenseGroups.map((row) => (
                      <tr key={row.articleId}>
                        <td>{row.articleName}</td>
                        <td className="text-right">{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

// БДДС (план)
const BddsTab = ({
  periodFrom,
  periodTo,
}: {
  periodFrom: string;
  periodTo: string;
}) => {
  const { data, isLoading, error } = useGetBddsReportQuery({
    periodFrom,
    periodTo,
  });

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-red-600">Ошибка загрузки отчета</div>
      </Card>
    );
  }

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">
          Нет данных за выбранный период
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Статья</th>
              <th className="text-right">Плановая сумма</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.articleId}>
                <td>{row.articleName || 'Без статьи'}</td>
                <td className="text-right">{formatMoney(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// План vs Факт
const PlanFactTab = ({
  periodFrom,
  periodTo,
}: {
  periodFrom: string;
  periodTo: string;
}) => {
  const { data, isLoading, error } = useGetPlanFactReportQuery({
    periodFrom,
    periodTo,
  });

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-red-600">Ошибка загрузки отчета</div>
      </Card>
    );
  }

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">
          Нет данных за выбранный период
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Статья</th>
              <th className="text-right">План</th>
              <th className="text-right">Факт</th>
              <th className="text-right">Отклонение</th>
              <th className="text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map(
              (
                row: {
                  key: string;
                  article: string;
                  plan: number;
                  fact: number;
                  delta: number;
                },
                idx: number
              ) => {
                const percentage =
                  row.plan !== 0
                    ? ((row.delta / row.plan) * 100).toFixed(1)
                    : '0';
                return (
                  <tr key={idx}>
                    <td>{row.article || 'Без статьи'}</td>
                    <td className="text-right">{formatMoney(row.plan)}</td>
                    <td className="text-right">{formatMoney(row.fact)}</td>
                    <td
                      className={`text-right ${
                        row.delta >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatMoney(row.delta)}
                    </td>
                    <td
                      className={`text-right ${
                        row.delta >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {percentage}%
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// ДДС (детально)
const DDSTab = ({
  periodFrom,
  periodTo,
}: {
  periodFrom: string;
  periodTo: string;
}) => {
  const { data, isLoading, error } = useGetDdsReportQuery({
    periodFrom,
    periodTo,
  });

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      </Card>
    );
  }

  if (error) {
    // Enhanced error handling with logging
    console.error('DDS Report Error:', error);

    const errorMessage =
      'status' in error && error.status === 400
        ? 'Некорректные параметры запроса. Проверьте выбранные даты.'
        : 'status' in error && error.status === 403
          ? 'Недостаточно прав для просмотра отчета.'
          : 'status' in error && error.status === 500
            ? 'Ошибка сервера. Попробуйте позже.'
            : 'Ошибка загрузки отчета. Попробуйте обновить страницу.';

    return (
      <Card>
        <div className="space-y-4">
          <div className="text-red-600 font-semibold">Ошибка</div>
          <div className="text-gray-700">{errorMessage}</div>
          {'data' in error && error.data && (
            <div className="text-sm text-gray-500">
              Детали: {JSON.stringify(error.data)}
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500">
          Нет данных за выбранный период
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Остатки на счетах */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Остатки на счетах</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Счет</th>
                <th className="text-right">Остаток на начало</th>
                <th className="text-right">Остаток на конец</th>
                <th className="text-right">Изменение</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((account) => {
                const change = account.closingBalance - account.openingBalance;
                return (
                  <tr key={account.accountId}>
                    <td>{account.accountName}</td>
                    <td className="text-right">
                      {formatMoney(account.openingBalance)}
                    </td>
                    <td className="text-right">
                      {formatMoney(account.closingBalance)}
                    </td>
                    <td
                      className={`text-right ${
                        change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatMoney(change)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Поступления */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 text-green-600">
          Поступления
        </h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Статья</th>
                <th className="text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {data.inflows.map((flow) => (
                <tr key={flow.articleId}>
                  <td>{flow.articleName}</td>
                  <td className="text-right">{formatMoney(flow.total)}</td>
                </tr>
              ))}
              <tr className="font-bold border-t-2">
                <td>Итого поступлений</td>
                <td className="text-right text-green-600">
                  {formatMoney(data.summary.totalInflow)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Выбытия */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 text-red-600">Выбытия</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Статья</th>
                <th className="text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {data.outflows.map((flow) => (
                <tr key={flow.articleId}>
                  <td>{flow.articleName}</td>
                  <td className="text-right">{formatMoney(flow.total)}</td>
                </tr>
              ))}
              <tr className="font-bold border-t-2">
                <td>Итого выбытий</td>
                <td className="text-right text-red-600">
                  {formatMoney(data.summary.totalOutflow)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Итого */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Итого</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Поступления</div>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(data.summary.totalInflow)}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Выбытия</div>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(data.summary.totalOutflow)}
            </div>
          </div>
          <div
            className={`p-4 rounded-lg ${
              data.summary.netCashflow >= 0 ? 'bg-blue-50' : 'bg-orange-50'
            }`}
          >
            <div className="text-sm text-gray-600">Чистое изменение</div>
            <div
              className={`text-2xl font-bold ${
                data.summary.netCashflow >= 0
                  ? 'text-blue-600'
                  : 'text-orange-600'
              }`}
            >
              {formatMoney(data.summary.netCashflow)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
