import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL } from './common.js';

// Метрики для отслеживания производительности записи
const writeDuration = new Trend('db_write_duration');
const writeSuccessRate = new Rate('db_write_success');
const writeErrors = new Counter('db_write_errors');

export const options = {
  stages: [
    { duration: '1m', target: 30 },   // Разгон
    { duration: '3m', target: 30 },   // Базовая нагрузка
    { duration: '2m', target: 100 },   // Увеличение
    { duration: '5m', target: 100 },   // Удержание
    { duration: '2m', target: 0 },     // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    'db_write_duration': ['p(95)<400'],
    'db_write_success': ['rate>0.99'],
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

  // Получаем справочники для создания операций
  let accountsRes = http.get(`${BASE_URL}/api/accounts`, headers);
  let articlesRes = http.get(`${BASE_URL}/api/articles`, headers);
  let counterpartiesRes = http.get(`${BASE_URL}/api/counterparties`, headers);

  let accounts = [];
  let articles = [];
  let counterparties = [];

  try {
    accounts = accountsRes.json();
    articles = articlesRes.json();
    counterparties = counterpartiesRes.json();
  } catch (e) {
    return;
  }

  if (!Array.isArray(accounts) || accounts.length === 0) return;
  if (!Array.isArray(articles) || articles.length === 0) return;

  // Тест 1: Одиночные INSERT операции
  group('Single Inserts', function () {
    for (let i = 0; i < 5; i++) {
      const operationType = ['income', 'expense'][Math.floor(Math.random() * 2)];
      const filteredArticles = articles.filter(a => a && a.type === operationType);
      const article = filteredArticles.length > 0 ? filteredArticles[0] : articles[0];

      const payload = {
        type: operationType,
        operationDate: getRandomDate(),
        amount: Math.floor(Math.random() * 10000) + 1000,
        currency: 'RUB',
        accountId: accounts[0].id,
        articleId: article.id,
        description: `Single insert test ${i} - ${new Date().toISOString()}`
      };

      const startTime = Date.now();
      let res = http.post(
        `${BASE_URL}/api/operations`,
        JSON.stringify(payload),
        headers
      );
      const duration = Date.now() - startTime;

      writeDuration.add(duration);
      if (res.status === 201 || res.status === 200) {
        writeSuccessRate.add(1);
      } else {
        writeSuccessRate.add(0);
        writeErrors.add(1);
      }

      check(res, {
        'operation created': (r) => r.status === 200 || r.status === 201,
        'operation created fast': () => duration < 400
      });

      sleep(0.2);
    }
  });

  // Тест 2: Массовые INSERT операции (batch)
  group('Batch Inserts', function () {
    const batchSize = 10;
    const createdIds = [];

    for (let i = 0; i < batchSize; i++) {
      const operationType = ['income', 'expense'][Math.floor(Math.random() * 2)];
      const filteredArticles = articles.filter(a => a && a.type === operationType);
      const article = filteredArticles.length > 0 ? filteredArticles[0] : articles[0];

      const payload = {
        type: operationType,
        operationDate: getRandomDate(),
        amount: Math.floor(Math.random() * 10000) + 1000,
        currency: 'RUB',
        accountId: accounts[0].id,
        articleId: article.id,
        description: `Batch insert ${i} - ${new Date().toISOString()}`
      };

      const startTime = Date.now();
      let res = http.post(
        `${BASE_URL}/api/operations`,
        JSON.stringify(payload),
        headers
      );
      const duration = Date.now() - startTime;

      writeDuration.add(duration);
      if (res.status === 201 || res.status === 200) {
        writeSuccessRate.add(1);
        try {
          const created = res.json();
          if (created && created.id) {
            createdIds.push(created.id);
          }
        } catch (e) {
          // Ignore
        }
      } else {
        writeSuccessRate.add(0);
        writeErrors.add(1);
      }

      // Минимальная задержка между операциями
      sleep(0.1);
    }

    check(createdIds, {
      'batch operations created': (ids) => ids.length >= batchSize * 0.9
    });
  });

  // Тест 3: INSERT с внешними ключами (проверка целостности)
  group('Inserts with Foreign Keys', function () {
    // Создаем операцию со всеми связями
    const filteredArticles = articles.filter(a => a && a.type === 'expense');
    const article = filteredArticles.length > 0 ? filteredArticles[0] : articles[0];

    const payload = {
      type: 'expense',
      operationDate: getRandomDate(),
      amount: 5000,
      currency: 'RUB',
      accountId: accounts[0].id,
      articleId: article.id,
      description: 'Test with all relationships'
    };

    if (counterparties.length > 0) {
      payload.counterpartyId = counterparties[0].id;
    }

    const startTime = Date.now();
    let res = http.post(
      `${BASE_URL}/api/operations`,
      JSON.stringify(payload),
      headers
    );
    writeDuration.add(Date.now() - startTime);
    writeSuccessRate.add(res.status === 201 || res.status === 200);

    check(res, {
      'operation with FK created': (r) => r.status === 200 || r.status === 201
    });
  });

  // Тест 4: INSERT transfer операций (сложные связи)
  group('Transfer Inserts', function () {
    if (accounts.length < 2) return;

    const payload = {
      type: 'transfer',
      operationDate: getRandomDate(),
      amount: 3000,
      currency: 'RUB',
      sourceAccountId: accounts[0].id,
      targetAccountId: accounts[1].id,
      description: 'Transfer test'
    };

    const startTime = Date.now();
    let res = http.post(
      `${BASE_URL}/api/operations`,
      JSON.stringify(payload),
      headers
    );
    writeDuration.add(Date.now() - startTime);
    writeSuccessRate.add(res.status === 201 || res.status === 200);

    check(res, {
      'transfer created': (r) => r.status === 200 || r.status === 201
    });
  });

  sleep(0.5);
}
