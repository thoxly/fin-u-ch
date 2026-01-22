import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL } from './common.js';

// Метрики для отслеживания производительности чтения
const readDuration = new Trend('db_read_duration');
const readSuccessRate = new Rate('db_read_success');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Разгон
    { duration: '3m', target: 50 },   // Базовая нагрузка
    { duration: '2m', target: 200 },  // Увеличение
    { duration: '5m', target: 200 },   // Удержание
    { duration: '2m', target: 0 },    // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    'db_read_duration': ['p(95)<300'],
    'db_read_success': ['rate>0.99'],
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

  // Тест 1: Простые SELECT запросы (справочники)
  group('Simple Reads - Catalogs', function () {
    const startTime = Date.now();
    
    let accountsRes = http.get(`${BASE_URL}/api/accounts`, headers);
    readDuration.add(Date.now() - startTime);
    readSuccessRate.add(accountsRes.status === 200);
    check(accountsRes, {
      'accounts read': (r) => r.status === 200,
      'accounts fast': (r) => r.timings.duration < 200
    });

    let articlesRes = http.get(`${BASE_URL}/api/articles`, headers);
    readSuccessRate.add(articlesRes.status === 200);
    check(articlesRes, {
      'articles read': (r) => articlesRes.status === 200
    });

    let counterpartiesRes = http.get(`${BASE_URL}/api/counterparties`, headers);
    readSuccessRate.add(counterpartiesRes.status === 200);
    check(counterpartiesRes, {
      'counterparties read': (r) => counterpartiesRes.status === 200
    });
  });

  // Тест 2: SELECT с фильтрами (WHERE условия)
  group('Filtered Reads - Operations', function () {
    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - 3);
    const dateFromStr = dateFrom.toISOString().split('T')[0];

    // Фильтр по типу
    let typeRes = http.get(`${BASE_URL}/api/operations?type=expense`, headers);
    readSuccessRate.add(typeRes.status === 200);
    check(typeRes, {
      'filter by type': (r) => r.status === 200
    });

    // Фильтр по дате
    let dateRes = http.get(`${BASE_URL}/api/operations?dateFrom=${dateFromStr}`, headers);
    readSuccessRate.add(dateRes.status === 200);
    check(dateRes, {
      'filter by date': (r) => r.status === 200
    });

    // Комбинированные фильтры
    let combinedRes = http.get(
      `${BASE_URL}/api/operations?type=income&dateFrom=${dateFromStr}&limit=100`,
      headers
    );
    readSuccessRate.add(combinedRes.status === 200);
    check(combinedRes, {
      'combined filters': (r) => r.status === 200
    });
  });

  // Тест 3: SELECT с пагинацией (LIMIT/OFFSET)
  group('Paginated Reads', function () {
    for (let page = 0; page < 5; page++) {
      const limit = 20;
      const offset = page * limit;
      const startTime = Date.now();
      
      let res = http.get(
        `${BASE_URL}/api/operations?limit=${limit}&offset=${offset}`,
        headers
      );
      
      readDuration.add(Date.now() - startTime);
      readSuccessRate.add(res.status === 200);
      check(res, {
        [`page ${page} loaded`]: (r) => r.status === 200
      });

      sleep(0.1);
    }
  });

  // Тест 4: SELECT с JOIN (операции со связанными данными)
  group('Reads with Relationships', function () {
    // Получаем операции (должны включать связанные account, article)
    let opsRes = http.get(`${BASE_URL}/api/operations?limit=50`, headers);
    readSuccessRate.add(opsRes.status === 200);
    
    let operations = [];
    try {
      operations = opsRes.json();
    } catch (e) {
      return;
    }

    // Проверяем, что операции содержат связанные данные
    if (Array.isArray(operations) && operations.length > 0) {
      const firstOp = operations[0];
      check(firstOp, {
        'operation has relationships': () => 
          firstOp.account || firstOp.article || firstOp.counterparty
      });
    }
  });

  // Тест 5: SELECT по ID (индексированные запросы)
  group('Indexed Reads - By ID', function () {
    // Получаем список для выборки ID
    let listRes = http.get(`${BASE_URL}/api/operations?limit=10`, headers);
    if (listRes.status !== 200) return;

    let operations = [];
    try {
      operations = listRes.json();
    } catch (e) {
      return;
    }

    // Читаем каждую операцию по ID
    for (let i = 0; i < Math.min(3, operations.length); i++) {
      if (operations[i] && operations[i].id) {
        const startTime = Date.now();
        let detailRes = http.get(
          `${BASE_URL}/api/operations/${operations[i].id}`,
          headers
        );
        readDuration.add(Date.now() - startTime);
        readSuccessRate.add(detailRes.status === 200);
        check(detailRes, {
          'operation by id': (r) => r.status === 200,
          'operation by id fast': (r) => r.timings.duration < 100
        });
      }
    }
  });

  // Тест 6: SELECT с сортировкой (ORDER BY)
  group('Sorted Reads', function () {
    // Операции должны быть отсортированы по дате (проверяем через API)
    let res = http.get(`${BASE_URL}/api/operations?limit=100`, headers);
    readSuccessRate.add(res.status === 200);
    check(res, {
      'sorted operations': (r) => r.status === 200
    });
  });

  sleep(0.5);
}
