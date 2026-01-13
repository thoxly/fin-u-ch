import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL } from './common.js';

export let options = {
  stages: [
    { duration: '1m', target: 100 },   // Разгон до 100
    { duration: '3m', target: 100 },   // Удержание 100
    { duration: '2m', target: 500 },   // Разгон до 500
    { duration: '3m', target: 500 },   // Удержание 500
    { duration: '3m', target: 1000 },  // Разгон до 1000
    { duration: '3m', target: 1000 },  // Удержание 1000
    { duration: '2m', target: 0 },     // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'], // Ошибки не должны превышать 10%
    http_req_duration: ['p(95)<2000'], // 95% запросов должны выполняться менее чем за 2 секунды
  },
};

// Функция для получения заголовков с токеном
function authHeaders(token) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
}

// Функция для получения случайного типа операции
function getRandomOperationType() {
  const types = ['income', 'expense', 'transfer'];
  return types[Math.floor(Math.random() * types.length)];
}

// Функция для получения случайной даты в пределах последних 6 месяцев
function getRandomDate() {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setMonth(today.getMonth() - Math.floor(Math.random() * 6));
  return pastDate.toISOString().split('T')[0];
}

// Функция для массового создания операций
function createMultipleOperations(headers, accounts, articles, counterparties, count = 5) {
  for (let i = 0; i < count; i++) {
    let operationType = getRandomOperationType();
    let operationDate = getRandomDate();
    let amount = Math.floor(Math.random() * 10000) + 1000; // от 1000 до 11000

    let operationPayload = {
      type: operationType,
      operationDate: operationDate,
      amount: amount,
      currency: 'RUB',
      description: `Load test operation ${i + 1} - ${new Date().toISOString()}`
    };

    // Установка ID статьи в зависимости от типа операции
    if (Array.isArray(articles) && articles.length > 0) {
      let filteredArticles = articles.filter(a => a && a.type === operationType);
      if (filteredArticles.length > 0) {
        operationPayload.articleId = filteredArticles[0].id;
      } else {
        // Если нет подходящей статьи, берем первую доступную
        operationPayload.articleId = articles[0].id;
      }
    }

    // Установка ID счета
    if (Array.isArray(accounts) && accounts.length > 0) {
      operationPayload.accountId = accounts[0].id;

      // Для transfer операций нужно указать source и target счета
      if (operationType === 'transfer' && accounts.length > 1) {
        operationPayload.sourceAccountId = accounts[0].id;
        operationPayload.targetAccountId = accounts[1].id;
      }
    }

    // Установка ID контрагента
    if (Array.isArray(counterparties) && counterparties.length > 0) {
      operationPayload.counterpartyId = counterparties[0].id;
    }

    let createOpRes = http.post(`${BASE_URL}/api/operations`, JSON.stringify(operationPayload), headers);
    check(createOpRes, {
      'operation created': (r) => r.status === 200 || r.status === 201
    });

    // Небольшая задержка между созданием операций
    sleep(1.0);
  }
}

// Функция для массового обновления операций
function updateMultipleOperations(headers, operations, count = 3) {
  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    return;
  }

  // Обновляем случайные операции
  for (let i = 0; i < Math.min(count, operations.length); i++) {
    // Проверяем, что operations.length > 0 перед вызовом Math.random()
    if (operations.length === 0) {
      continue;
    }
    let randomIndex = Math.floor(Math.random() * operations.length);
    let randomOp = operations[randomIndex];

    // Проверяем, что randomOp и randomOp.id существуют
    if (!randomOp || !randomOp.id) {
      continue;
    }

    let updatePayload = {
      description: `Updated by load test - ${new Date().toISOString()} - Batch ${i + 1}`
    };

    let updateRes = http.patch(`${BASE_URL}/api/operations/${randomOp.id}`,
      JSON.stringify(updatePayload), headers);
    check(updateRes, {
      'operation updated': (r) => r.status === 200
    });

    // Небольшая задержка между обновлениями
    sleep(1.0);
  }
}

// Функция для массового удаления операций
function deleteMultipleOperations(headers, operations, count = 2) {
  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    return;
  }

  // Удаляем случайные операции
  for (let i = 0; i < Math.min(count, operations.length); i++) {
    // Проверяем, что operations.length > 0 перед вызовом Math.random()
    if (operations.length === 0) {
      continue;
    }
    let randomIndex = Math.floor(Math.random() * operations.length);
    let randomOp = operations[randomIndex];

    // Проверяем, что randomOp и randomOp.id существуют
    if (!randomOp || !randomOp.id) {
      continue;
    }

    let deleteRes = http.del(`${BASE_URL}/api/operations/${randomOp.id}`, null, headers);
    check(deleteRes, {
      'operation deleted': (r) => r.status === 200 || r.status === 204
    });

    // Небольшая задержка между удалениями
    sleep(1.0);
  }
}

// Функция для выполнения различных операций с фильтрами
function performFilteredOperations(headers) {
  // Получение операций с фильтрами
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - 1);
  const dateFromStr = dateFrom.toISOString().split('T')[0];

  let filteredOpsRes = http.get(`${BASE_URL}/api/operations?dateFrom=${dateFromStr}&type=expense`, headers);
  check(filteredOpsRes, {
    'filtered operations loaded': (r) => r.status === 200
  });

  let incomeOpsRes = http.get(`${BASE_URL}/api/operations?type=income`, headers);
  check(incomeOpsRes, {
    'income operations loaded': (r) => r.status === 200
  });

  let transferOpsRes = http.get(`${BASE_URL}/api/operations?type=transfer`, headers);
  check(transferOpsRes, {
    'transfer operations loaded': (r) => r.status === 200
  });
}

export default function () {
  // 1. Создание демо-пользователя
  let sessionRes = http.post(`${BASE_URL}/api/demo/start-session`);

  let session;
  try {
    session = sessionRes.json();
  } catch (e) {
    console.log('Failed to parse session response:', e);
    console.log('Response body:', sessionRes.body);
    return;
  }

  if (!session || !session.data) {
    console.log(`Failed to start session. Status: ${sessionRes.status}`);
    console.log(`Response body: ${sessionRes.body}`);
    return;
  }

  let { accessToken } = session.data;
  let headers = authHeaders(accessToken);

  // Проверка успешного создания сессии
  check(sessionRes, {
    'session created': (r) => r.status === 201,
    'has access token': () => !!accessToken
  });

  // 2. Основная деятельность демо-пользователя
  group('Demo User Activity', function () {
    // Просмотр дашборда
    let dashboardRes = http.get(`${BASE_URL}/api/reports/dashboard`, headers);
    check(dashboardRes, {
      'dashboard loaded': (r) => r.status === 200
    });

    // Получение справочников
    let accountsRes = http.get(`${BASE_URL}/api/accounts`, headers);
    let accounts = [];
    try {
      accounts = accountsRes.json();
    } catch (e) {
      console.log('Failed to parse accounts response:', e);
    }

    let articlesRes = http.get(`${BASE_URL}/api/articles`, headers);
    let articles = [];
    try {
      articles = articlesRes.json();
    } catch (e) {
      console.log('Failed to parse articles response:', e);
    }

    // Получение контрагентов
    let counterpartiesRes = http.get(`${BASE_URL}/api/counterparties`, headers);
    let counterparties = [];
    try {
      counterparties = counterpartiesRes.json();
    } catch (e) {
      console.log('Failed to parse counterparties response:', e);
    }

    // Получение начальных операций
    let initialOperationsRes = http.get(`${BASE_URL}/api/operations`, headers);
    let initialOperations = [];
    try {
      initialOperations = initialOperationsRes.json();
    } catch (e) {
      console.log('Failed to parse initial operations response:', e);
    }

    // Массовое создание операций (нагрузка)
    group('Operations Creation Load', function () {
      if (Array.isArray(accounts) && Array.isArray(articles) && Array.isArray(counterparties)) {
        createMultipleOperations(headers, accounts, articles, counterparties, 10);
      }
    });

    // Повторное получение операций для обновления
    let operationsAfterCreationRes = http.get(`${BASE_URL}/api/operations`, headers);
    let operationsAfterCreation = [];
    try {
      operationsAfterCreation = operationsAfterCreationRes.json();
    } catch (e) {
      console.log('Failed to parse operations after creation:', e);
    }

    // Массовое обновление операций (нагрузка)
    group('Operations Update Load', function () {
      if (Array.isArray(operationsAfterCreation)) {
        updateMultipleOperations(headers, operationsAfterCreation, 5);
      }
    });

    // Выполнение операций с фильтрами (нагрузка)
    group('Filtered Operations Load', function () {
      performFilteredOperations(headers);
    });

    // Просмотр отчетов
    let cashflowRes = http.get(`${BASE_URL}/api/reports/cashflow`, headers);
    check(cashflowRes, {
      'cashflow report loaded': (r) => r.status === 200
    });

    let bddsRes = http.get(`${BASE_URL}/api/reports/bdds`, headers);
    check(bddsRes, {
      'bdds report loaded': (r) => r.status === 200
    });

    // Просмотр планов
    let plansRes = http.get(`${BASE_URL}/api/plans`, headers);
    check(plansRes, {
      'plans loaded': (r) => r.status === 200
    });

    // Массовое удаление операций (нагрузка)
    group('Operations Deletion Load', function () {
      // Получаем свежий список операций для удаления
      let freshOpsRes = http.get(`${BASE_URL}/api/operations`, headers);
      let freshOps = [];
      try {
        freshOps = freshOpsRes.json();
      } catch (e) {
        console.log('Failed to parse fresh operations for deletion:', e);
      }

      if (Array.isArray(freshOps)) {
        deleteMultipleOperations(headers, freshOps, 3);
      }
    });

    // Дополнительные операции с фильтрами
    group('Additional Filtered Operations', function () {
      // Проверка с разными параметрами
      let opsByDateRes = http.get(`${BASE_URL}/api/operations?dateFrom=2025-01-01&limit=50`, headers);
      check(opsByDateRes, {
        'operations by date loaded': (r) => r.status === 200
      });

      let opsByAccountRes = http.get(`${BASE_URL}/api/operations?accountId=${accounts.length > 0 ? accounts[0].id : ''}&limit=20`, headers);
      // Не проверяем статус, если нет счетов
      if (accounts.length > 0) {
        check(opsByAccountRes, {
          'operations by account loaded': (r) => r.status === 200
        });
      }
    });

    // Дополнительная нагрузка на операции
    group('Intensive Operations Load', function () {
      // Создание дополнительных операций
      if (Array.isArray(accounts) && Array.isArray(articles) && Array.isArray(counterparties)) {
        createMultipleOperations(headers, accounts, articles, counterparties, 5);
      }

      // Пауза для имитации времени между действиями
      sleep(0.5);

      // Еще одна серия запросов
      for (let i = 0; i < 3; i++) {
        let opsRes = http.get(`${BASE_URL}/api/operations?limit=10`, headers);
        check(opsRes, {
          'operations loaded in intensive phase': (r) => r.status === 200
        });

        sleep(0.2);
      }
    });
  });

  // Пауза для имитации реальной активности
  sleep(Math.random() * 3 + 2); // Случайная пауза от 2 до 5 секунд
}