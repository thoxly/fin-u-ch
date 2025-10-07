import { useState } from 'react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Input } from '../shared/ui/Input';
import { useGetDashboardQuery } from '../store/api/reportsApi';
import { formatMoney } from '../shared/lib/money';
import { toISODate } from '../shared/lib/date';
import { subMonths, startOfMonth } from 'date-fns';

export const DashboardPage = () => {
  const today = new Date();
  const [periodFrom, setPeriodFrom] = useState(
    toISODate(startOfMonth(subMonths(today, 2)))
  );
  const [periodTo, setPeriodTo] = useState(toISODate(today));

  const { data, isLoading, error } = useGetDashboardQuery({
    periodFrom,
    periodTo,
    mode: 'both',
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
        </div>

        {/* Фильтры */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Загрузка данных...</div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card>
            <div className="text-red-600">
              Ошибка загрузки данных. Попробуйте обновить страницу.
            </div>
          </Card>
        )}

        {/* Dashboard data */}
        {data && (
          <>
            {/* Карточки с показателями */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Доходы
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatMoney(data.income || 0)}
                </div>
              </Card>

              <Card>
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Расходы
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {formatMoney(data.expense || 0)}
                </div>
              </Card>

              <Card>
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Чистая прибыль
                </div>
                <div
                  className={`text-2xl font-bold ${
                    (data.netProfit || 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatMoney(data.netProfit || 0)}
                </div>
              </Card>
            </div>

            {/* Остатки по счетам */}
            {data.balancesByAccount && data.balancesByAccount.length > 0 && (
              <Card title="Остатки по счетам">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Счет</th>
                        <th className="text-right">Остаток</th>
                        <th>Валюта</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.balancesByAccount.map(
                        (balance: {
                          accountId: string;
                          accountName: string;
                          balance: number;
                          currency: string;
                        }) => (
                          <tr key={balance.accountId}>
                            <td>{balance.accountName}</td>
                            <td className="text-right">
                              {formatMoney(balance.balance, balance.currency)}
                            </td>
                            <td>{balance.currency}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* График (заглушка) */}
            {data.series && data.series.length > 0 && (
              <Card title="Динамика доходов и расходов">
                <div className="text-gray-500 text-center py-8">
                  График будет здесь (требует библиотеку recharts)
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
