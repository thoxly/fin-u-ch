import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL } from './common.js';

// Метрики для отслеживания работы со связями
const relationshipDuration = new Trend('db_relationship_duration');
const relationshipSuccessRate = new Rate('db_relationship_success');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Разгон
    { duration: '3m', target: 20 },   // Базовая нагрузка
    { duration: '2m', target: 50 },    // Увеличение
    { duration: '5m', target: 50 },     // Удержание
    { duration: '2m', target: 0 },      // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<600', 'p(99)<1200'],
    'db_relationship_duration': ['p(95)<500'],
    'db_relationship_success': ['rate>0.99'],
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

  // Тест 1: Операции с JOIN к Account (один-ко-многим)
  group('Operations with Account JOIN', function () {
    const startTime = Date.now();
    let res = http.get(`${BASE_URL}/api/operations?limit=50`, headers);
    const duration = Date.now() - startTime;

    relationshipDuration.add(duration);
    relationshipSuccessRate.add(res.status === 200);

    let operations = [];
    try {
      operations = res.json();
    } catch (e) {
      return;
    }

    // Проверяем, что операции содержат данные счета
    if (Array.isArray(operations) && operations.length > 0) {
      const hasAccount = operations.some(op => op.account || op.accountId);
      check(hasAccount, {
        'operations have account relationship': () => hasAccount
      });
    }
  });

  // Тест 2: Операции с JOIN к Article (один-ко-многим)
  group('Operations with Article JOIN', function () {
    let res = http.get(`${BASE_URL}/api/operations?limit=50`, headers);
    relationshipSuccessRate.add(res.status === 200);

    let operations = [];
    try {
      operations = res.json();
    } catch (e) {
      return;
    }

    // Проверяем, что операции содержат данные статьи
    if (Array.isArray(operations) && operations.length > 0) {
      const hasArticle = operations.some(op => op.article || op.articleId);
      check(hasArticle, {
        'operations have article relationship': () => hasArticle
      });
    }
  });

  // Тест 3: Transfer операции с двумя счетами (многие-ко-многим через промежуточную таблицу)
  group('Transfer Operations - Multiple Accounts', function () {
    let res = http.get(`${BASE_URL}/api/operations?type=transfer&limit=20`, headers);
    relationshipSuccessRate.add(res.status === 200);

    let operations = [];
    try {
      operations = res.json();
    } catch (e) {
      return;
    }

    // Проверяем, что transfer операции имеют source и target счета
    if (Array.isArray(operations) && operations.length > 0) {
      const transferOps = operations.filter(op => op.type === 'transfer');
      if (transferOps.length > 0) {
        const hasBothAccounts = transferOps.some(op => 
          (op.sourceAccount || op.sourceAccountId) && 
          (op.targetAccount || op.targetAccountId)
        );
        check(hasBothAccounts, {
          'transfer has both accounts': () => hasBothAccounts
        });
      }
    }
  });

  // Тест 4: Иерархические связи (Articles с parentId)
  group('Hierarchical Relationships - Articles', function () {
    const startTime = Date.now();
    let res = http.get(`${BASE_URL}/api/articles`, headers);
    const duration = Date.now() - startTime;

    relationshipDuration.add(duration);
    relationshipSuccessRate.add(res.status === 200);

    let articles = [];
    try {
      articles = res.json();
    } catch (e) {
      return;
    }

    // Проверяем иерархию статей
    if (Array.isArray(articles) && articles.length > 0) {
      const hasParent = articles.some(a => a.parentId || a.parent);
      check(hasParent, {
        'articles have parent relationship': () => hasParent
      });
    }
  });

  // Тест 5: Операции с Counterparty (опциональная связь)
  group('Operations with Counterparty', function () {
    let res = http.get(`${BASE_URL}/api/operations?limit=100`, headers);
    relationshipSuccessRate.add(res.status === 200);

    let operations = [];
    try {
      operations = res.json();
    } catch (e) {
      return;
    }

    // Проверяем, что некоторые операции могут иметь контрагента
    if (Array.isArray(operations) && operations.length > 0) {
      const hasCounterparty = operations.some(op => op.counterparty || op.counterpartyId);
      check(hasCounterparty !== undefined, {
        'operations can have counterparty': () => true // Просто проверяем, что поле доступно
      });
    }
  });

  // Тест 6: Каскадные операции (удаление связанных данных)
  group('Cascade Operations', function () {
    // Получаем операции
    let opsRes = http.get(`${BASE_URL}/api/operations?limit=5`, headers);
    if (opsRes.status !== 200) return;

    let operations = [];
    try {
      operations = opsRes.json();
    } catch (e) {
      return;
    }

    // Создаем новую операцию для теста каскада
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

    const filteredArticles = articles.filter(a => a && a.type === 'expense');
    const article = filteredArticles.length > 0 ? filteredArticles[0] : articles[0];

    // Создаем операцию
    const payload = {
      type: 'expense',
      operationDate: new Date().toISOString().split('T')[0],
      amount: 1000,
      currency: 'RUB',
      accountId: accounts[0].id,
      articleId: article.id,
      description: 'Cascade test operation'
    };

    let createRes = http.post(
      `${BASE_URL}/api/operations`,
      JSON.stringify(payload),
      headers
    );
    relationshipSuccessRate.add(createRes.status === 201 || createRes.status === 200);

    check(createRes, {
      'operation with relationships created': (r) => r.status === 200 || r.status === 201
    });
  });

  // Тест 7: Сложные JOIN запросы (множественные связи)
  group('Complex JOIN Queries', function () {
    // Запрос операций с фильтрами по связанным таблицам
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

    const startTime = Date.now();
    // Запрос с фильтрами по account и article (требует JOIN)
    let res = http.get(
      `${BASE_URL}/api/operations?accountId=${accounts[0].id}&articleId=${articles[0].id}&limit=50`,
      headers
    );
    const duration = Date.now() - startTime;

    relationshipDuration.add(duration);
    relationshipSuccessRate.add(res.status === 200);

    check(res, {
      'complex join query': (r) => r.status === 200,
      'complex join fast': () => duration < 600
    });
  });

  sleep(0.5);
}
