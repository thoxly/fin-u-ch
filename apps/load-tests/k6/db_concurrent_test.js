import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL } from './common.js';

// Метрики для отслеживания конкурентных операций
const concurrentDuration = new Trend('db_concurrent_duration');
const concurrentSuccessRate = new Rate('db_concurrent_success');
const deadlockErrors = new Counter('db_deadlocks');
const lockTimeoutErrors = new Counter('db_lock_timeouts');
const raceConditionErrors = new Counter('db_race_conditions');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Разгон
    { duration: '2m', target: 50 },   // Базовая нагрузка
    { duration: '1m', target: 200 },  // Резкий скачок (spike для проверки конкурентности)
    { duration: '3m', target: 200 },   // Удержание высокой нагрузки
    { duration: '2m', target: 0 },     // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Допускаем больше ошибок при конкурентности
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    'db_concurrent_success': ['rate>0.95'], // 95% успешных операций
    'db_deadlocks': ['count<10'], // Не должно быть много deadlocks
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

function getRandomDate() {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setMonth(today.getMonth() - Math.floor(Math.random() * 6));
  return pastDate.toISOString().split('T')[0];
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

  // Получаем справочники
  let accountsRes = http.get(`${BASE_URL}/api/accounts`, headers);
  let articlesRes = http.get(`${BASE_URL}/api/articles`, headers);
  let opsRes = http.get(`${BASE_URL}/api/operations?limit=20`, headers);

  let accounts = [];
  let articles = [];
  let operations = [];

  try {
    accounts = accountsRes.json();
    articles = articlesRes.json();
    operations = opsRes.json();
  } catch (e) {
    return;
  }

  if (!Array.isArray(accounts) || accounts.length === 0) return;
  if (!Array.isArray(articles) || articles.length === 0) return;

  // Тест 1: Конкурентное создание операций (race condition на счетах)
  group('Concurrent Creates - Account Balance', function () {
    const filteredArticles = articles.filter(a => a && a.type === 'expense');
    const article = filteredArticles.length > 0 ? filteredArticles[0] : articles[0];

    // Несколько пользователей создают операции одновременно на один счет
    for (let i = 0; i < 5; i++) {
      const payload = {
        type: 'expense',
        operationDate: getRandomDate(),
        amount: 1000 + i * 100,
        currency: 'RUB',
        accountId: accounts[0].id,
        articleId: article.id,
        description: `Concurrent create ${i} - ${new Date().toISOString()}`
      };

      const startTime = Date.now();
      let res = http.post(
        `${BASE_URL}/api/operations`,
        JSON.stringify(payload),
        headers
      );
      const duration = Date.now() - startTime;

      concurrentDuration.add(duration);
      if (res.status === 201 || res.status === 200) {
        concurrentSuccessRate.add(1);
      } else {
        concurrentSuccessRate.add(0);
        if (res.body && res.body.toLowerCase().includes('deadlock')) {
          deadlockErrors.add(1);
        }
        if (res.body && res.body.toLowerCase().includes('timeout')) {
          lockTimeoutErrors.add(1);
        }
      }

      check(res, {
        'concurrent create success': (r) => r.status === 200 || r.status === 201
      });

      // Минимальная задержка для создания конкурентности
      sleep(0.05);
    }
  });

  // Тест 2: Конкурентное обновление одной записи
  group('Concurrent Updates - Same Record', function () {
    if (!Array.isArray(operations) || operations.length === 0) return;

    const targetOp = operations[0];
    if (!targetOp || !targetOp.id) return;

    // Несколько попыток обновить одну запись одновременно
    for (let i = 0; i < 3; i++) {
      const payload = {
        description: `Concurrent update ${i} - ${Date.now()}`
      };

      const startTime = Date.now();
      let res = http.patch(
        `${BASE_URL}/api/operations/${targetOp.id}`,
        JSON.stringify(payload),
        headers
      );
      const duration = Date.now() - startTime;

      concurrentDuration.add(duration);
      if (res.status === 200) {
        concurrentSuccessRate.add(1);
      } else {
        concurrentSuccessRate.add(0);
        if (res.status === 409) {
          raceConditionErrors.add(1);
        }
        if (res.body && res.body.toLowerCase().includes('deadlock')) {
          deadlockErrors.add(1);
        }
      }

      sleep(0.05);
    }
  });

  // Тест 3: Конкурентное чтение и запись (read-write conflict)
  group('Read-Write Conflicts', function () {
    const filteredArticles = articles.filter(a => a && a.type === 'income');
    const article = filteredArticles.length > 0 ? filteredArticles[0] : articles[0];

    // Читаем операции
    let readRes = http.get(`${BASE_URL}/api/operations?limit=10`, headers);
    concurrentSuccessRate.add(readRes.status === 200);

    // Одновременно создаем новую операцию
    const payload = {
      type: 'income',
      operationDate: getRandomDate(),
      amount: 2000,
      currency: 'RUB',
      accountId: accounts[0].id,
      articleId: article.id,
      description: 'Read-write conflict test'
    };

    let createRes = http.post(
      `${BASE_URL}/api/operations`,
      JSON.stringify(payload),
      headers
    );
    concurrentSuccessRate.add(createRes.status === 201 || createRes.status === 200);

    check(readRes, {
      'read during write': (r) => r.status === 200
    });
    check(createRes, {
      'write during read': (r) => createRes.status === 200 || createRes.status === 201
    });
  });

  // Тест 4: Массовые конкурентные операции (нагрузка на транзакции)
  group('Mass Concurrent Operations', function () {
    const filteredArticles = articles.filter(a => a && a.type === 'expense');
    const article = filteredArticles.length > 0 ? filteredArticles[0] : articles[0];

    // Создаем много операций одновременно
    for (let i = 0; i < 10; i++) {
      const payload = {
        type: 'expense',
        operationDate: getRandomDate(),
        amount: 500 + i * 50,
        currency: 'RUB',
        accountId: accounts[0].id,
        articleId: article.id,
        description: `Mass concurrent ${i}`
      };

      const startTime = Date.now();
      let res = http.post(
        `${BASE_URL}/api/operations`,
        JSON.stringify(payload),
        headers
      );
      concurrentDuration.add(Date.now() - startTime);

      if (res.status === 201 || res.status === 200) {
        concurrentSuccessRate.add(1);
      } else {
        concurrentSuccessRate.add(0);
        const body = res.body.toLowerCase();
        if (body.includes('deadlock')) {
          deadlockErrors.add(1);
        }
        if (body.includes('timeout') || body.includes('lock')) {
          lockTimeoutErrors.add(1);
        }
      }

      // Очень маленькая задержка для максимальной конкурентности
      sleep(0.01);
    }
  });

  // Тест 5: Конкурентное удаление и обновление
  group('Concurrent Delete-Update', function () {
    if (!Array.isArray(operations) || operations.length < 2) return;

    const op1 = operations[0];
    const op2 = operations[1];

    if (!op1 || !op1.id || !op2 || !op2.id) return;

    // Пытаемся обновить одну операцию
    const updatePayload = {
      description: 'Update during delete test'
    };
    let updateRes = http.patch(
      `${BASE_URL}/api/operations/${op1.id}`,
      JSON.stringify(updatePayload),
      headers
    );

    // Одновременно пытаемся удалить другую
    let deleteRes = http.del(
      `${BASE_URL}/api/operations/${op2.id}`,
      null,
      headers
    );

    concurrentSuccessRate.add(updateRes.status === 200 ? 1 : 0);
    concurrentSuccessRate.add(deleteRes.status === 200 || deleteRes.status === 204 ? 1 : 0);

    check(updateRes, {
      'update in concurrent mode': (r) => r.status === 200
    });
    check(deleteRes, {
      'delete in concurrent mode': (r) => deleteRes.status === 200 || deleteRes.status === 204
    });
  });

  sleep(0.3);
}
