import { useState } from 'react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Input } from '../shared/ui/Input';
import { Button } from '../shared/ui/Button';
import {
  useGetCashflowReportQuery,
  useGetBddsReportQuery,
  useGetPlanFactReportQuery,
} from '../store/api/reportsApi';
import { formatMoney } from '../shared/lib/money';
import { toISODate } from '../shared/lib/date';
import { subMonths, startOfMonth } from 'date-fns';

type TabType = 'cashflow' | 'bdds' | 'planfact';

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
              <th className="text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: { key: string; article: string; amount: number }, idx: number) => (
              <tr key={idx}>
                <td>{row.article || 'Без статьи'}</td>
                <td className="text-right">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
            {data.rows.map((row: { key: string; article: string; amount: number }, idx: number) => (
              <tr key={idx}>
                <td>{row.article || 'Без статьи'}</td>
                <td className="text-right">{formatMoney(row.amount)}</td>
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
                  row.plan !== 0 ? ((row.delta / row.plan) * 100).toFixed(1) : '0';
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

