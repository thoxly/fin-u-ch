import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL } from './common.js';

// Метрики для отслеживания производительности отчетов
const reportDuration = new Trend('db_report_duration');
const reportSuccessRate = new Rate('db_report_success');
const cacheHitRate = new Rate('db_report_cache_hit');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Разгон (отчеты тяжелые)
    { duration: '3m', target: 10 },   // Базовая нагрузка
    { duration: '2m', target: 30 },    // Увеличение
    { duration: '5m', target: 30 },     // Удержание
    { duration: '2m', target: 0 },     // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // Отчеты могут быть медленнее
    'db_report_duration': ['p(95)<1500'],
    'db_report_success': ['rate>0.99'],
  },
};

function authHeaders(token) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
}

export default function () {
  // Создание демо-сессии
  let sessionRes = http.post(`${BASE_URL}/api/demo/start-session`);
  if (sessionRes.status !== 201) {
    return;
  }

  let session = sessionRes.json();
  if (!session || !session.data || !session.data.accessToken) {
    return;
  }

  let headers = authHeaders(session.data.accessToken);

  // Тест 1: Dashboard (агрегации, GROUP BY)
  group('Dashboard Report - Aggregations', function () {
    const startTime = Date.now();
    let res = http.get(`${BASE_URL}/api/reports/dashboard`, headers);
    const duration = Date.now() - startTime;

    reportDuration.add(duration);
    reportSuccessRate.add(res.status === 200);

    check(res, {
      'dashboard loaded': (r) => r.status === 200,
      'dashboard reasonable time': () => duration < 2000
    });

    // Проверяем структуру ответа (должны быть агрегаты)
    try {
      const data = res.json();
      check(data, {
        'dashboard has data': () => data !== null && data !== undefined
      });
    } catch (e) {
      // Ignore
    }
  });

  // Тест 2: Cashflow Report (агрегации по периодам)
  group('Cashflow Report - Time Aggregations', function () {
    const startTime = Date.now();
    let res = http.get(`${BASE_URL}/api/reports/cashflow`, headers);
    const duration = Date.now() - startTime;

    reportDuration.add(duration);
    reportSuccessRate.add(res.status === 200);

    check(res, {
      'cashflow loaded': (r) => r.status === 200,
      'cashflow reasonable time': () => duration < 2000
    });
  });

  // Тест 3: BDDS Report (план с разворачиванием)
  group('BDDS Report - Complex Joins', function () {
    const startTime = Date.now();
    let res = http.get(`${BASE_URL}/api/reports/bdds`, headers);
    const duration = Date.now() - startTime;

    reportDuration.add(duration);
    reportSuccessRate.add(res.status === 200);

    check(res, {
      'bdds loaded': (r) => r.status === 200,
      'bdds reasonable time': () => duration < 2000
    });
  });

  // Тест 4: Проверка кэширования (первый vs второй запрос)
  group('Report Caching', function () {
    // Первый запрос (cache miss)
    const firstStart = Date.now();
    let firstRes = http.get(`${BASE_URL}/api/reports/dashboard`, headers);
    const firstDuration = Date.now() - firstStart;

    sleep(0.5);

    // Второй запрос (cache hit - должен быть быстрее)
    const secondStart = Date.now();
    let secondRes = http.get(`${BASE_URL}/api/reports/dashboard`, headers);
    const secondDuration = Date.now() - secondStart;

    const cacheWorking = secondDuration < firstDuration * 0.7;
    cacheHitRate.add(cacheWorking ? 1 : 0);

    check(firstRes, {
      'first dashboard request': (r) => r.status === 200
    });
    check(secondRes, {
      'cached dashboard request': (r) => r.status === 200,
      'cache effective': () => cacheWorking
    });
  });

  // Тест 5: Сложные фильтры в операциях (множественные JOIN)
  group('Complex Filtered Queries', function () {
    // Получаем справочники
    let accountsRes = http.get(`${BASE_URL}/api/accounts`, headers);
    let articlesRes = http.get(`${BASE_URL}/api/articles`, headers);

    let accounts = [];
    let articles = [];

    try {
      accounts = accountsRes.json();
      articles = articlesRes.json();
    } catch (e) {
      return;
    }

    if (accounts.length === 0 || articles.length === 0) return;

    // Сложный запрос с множественными фильтрами
    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - 6);
    const dateFromStr = dateFrom.toISOString().split('T')[0];

    const startTime = Date.now();
    let res = http.get(
      `${BASE_URL}/api/operations?dateFrom=${dateFromStr}&accountId=${accounts[0].id}&articleId=${articles[0].id}&limit=100`,
      headers
    );
    const duration = Date.now() - startTime;

    reportDuration.add(duration);
    reportSuccessRate.add(res.status === 200);

    check(res, {
      'complex query executed': (r) => r.status === 200,
      'complex query reasonable time': () => duration < 1000
    });
  });

  // Тест 6: Агрегации в операциях (подсчеты, суммы)
  group('Operation Aggregations', function () {
    // Запрос операций с лимитом (сервер может делать подсчеты)
    const startTime = Date.now();
    let res = http.get(`${BASE_URL}/api/operations?limit=1000`, headers);
    const duration = Date.now() - startTime;

    reportDuration.add(duration);
    reportSuccessRate.add(res.status === 200);

    check(res, {
      'large operation list': (r) => r.status === 200,
      'large list reasonable time': () => duration < 1500
    });
  });

  sleep(1);
}
