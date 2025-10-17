/**
 * Тестовые данные для E2E тестов
 */

export const TEST_USERS = {
  valid: {
    email: 'demo@example.com',
    password: 'demo123',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
};

export const TEST_COMPANY = {
  id: 'test-company-id',
  name: 'Тестовая компания',
};

/**
 * Моковые данные для отчетов
 */
export const MOCK_CASHFLOW_DATA = {
  activities: [
    {
      id: 'operational',
      name: 'Операционная деятельность',
      type: 'activity',
      children: [
        {
          id: 'sales',
          name: 'Продажи',
          type: 'article',
          months: [
            { month: '2024-01', amount: 100000 },
            { month: '2024-02', amount: 120000 },
          ],
        },
        {
          id: 'salary',
          name: 'Зарплата',
          type: 'article',
          months: [
            { month: '2024-01', amount: -50000 },
            { month: '2024-02', amount: -55000 },
          ],
        },
      ],
    },
  ],
  summary: {
    totalInflow: 220000,
    totalOutflow: -105000,
    netCashflow: 115000,
  },
};

/**
 * Ожидаемые тексты в интерфейсе
 */
export const UI_TEXT = {
  cashflow: {
    title: 'ОДДС (факт)',
    operationalActivity: 'Операционная деятельность',
    sales: 'Продажи',
    salary: 'Зарплата',
    totalCashflow: 'Общий денежный поток',
    endBalance: 'Остаток на конец периода',
  },
  reports: {
    title: 'Отчеты',
    cashflowReport: 'Отчет о движении денежных средств',
  },
  common: {
    loading: 'Загрузка...',
    noData: 'Нет данных за выбранный период',
    error: 'Ошибка загрузки отчета',
  },
};
