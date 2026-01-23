import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL } from './common.js';

/**
 * Реалистичный нагрузочный тест с распределением пользователей по сценариям
 * 
 * Распределение:
 * - 70% VIEWER - только просмотр (дашборд, операции, справочники)
 * - 20% OPERATOR - создание/редактирование операций
 * - 5% PLANNER - работа с планами и бюджетами
 * - 5% ANALYST - просмотр отчетов и аналитики
 */

export let options = {
  stages: [
    { duration: '30s', target: 10 },   // Разминка: 10 пользователей
    { duration: '1m', target: 50 },     // Разгон до 50
    { duration: '2m', target: 50 },     // Удержание 50
    { duration: '1m', target: 100 },    // Разгон до 100
    { duration: '2m', target: 100 },    // Удержание 100
    { duration: '2m', target: 250 },    // Разгон до 250
    { duration: '3m', target: 250 },    // Удержание 250
    { duration: '2m', target: 500 },    // Разгон до 500
    { duration: '3m', target: 500 },    // Удержание 500
    { duration: '2m', target: 750 },    // Разгон до 750
    { duration: '3m', target: 750 },    // Удержание 750
    { duration: '2m', target: 1000 },   // Разгон до 1000
    { duration: '3m', target: 1000 },    // Удержание 1000
    { duration: '2m', target: 0 },      // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Ошибки не должны превышать 5%
    http_req_duration: ['p(95)<2000'], // 95% запросов должны выполняться менее чем за 2 секунды
    checks: ['rate>0.90'], // 90% всех проверок должны проходить успешно
  },
};

// Распределение пользователей по сценариям
const USER_SCENARIOS = {
  VIEWER: 0.70,        // 70% - только просмотр
  OPERATOR: 0.20,      // 20% - создание/редактирование операций
  PLANNER: 0.05,       // 5% - работа с планами и бюджетами
  ANALYST: 0.05,       // 5% - просмотр отчетов и аналитики
};

// Функция для получения заголовков с токеном и обходом rate limiting
function authHeaders(token) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Test-Mode': 'load-test', // Обход rate limiting для тестов
    }
  };
}

// Функция для получения случайного типа операции
function getRandomOperationType() {
  const types = ['income', 'expense', 'transfer'];
  return types[Math.floor(Math.random() * types.length)];
}

// Функция для получения случайной даты в пределах последних 3 месяцев
function getRandomDate() {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setMonth(today.getMonth() - Math.floor(Math.random() * 3));
  return pastDate.toISOString().split('T')[0];
}

// Функция для безопасного парсинга JSON ответа (поддержка формата { data: [] } и прямого массива)
function parseJsonResponse(response) {
  try {
    const json = response.json();
    // Если ответ в формате { data: [], pagination: {} }, извлекаем data
    if (json && typeof json === 'object' && 'data' in json && Array.isArray(json.data)) {
      return json.data;
    }
    // Если это прямой массив
    if (Array.isArray(json)) {
      return json;
    }
    return [];
  } catch (e) {
    return [];
  }
}

// Функция для создания одной операции
function createOperation(headers, accounts, articles, counterparties) {
  let operationType = getRandomOperationType();
  let operationDate = getRandomDate();
  let amount = Math.floor(Math.random() * 10000) + 1000; // от 1000 до 11000

  let operationPayload = {
    type: operationType,
    operationDate: operationDate,
    amount: amount,
    currency: 'RUB',
    description: `Load test operation - ${new Date().toISOString()}`
  };

  // Раздельная логика для transfer и income/expense операций
  if (operationType === 'transfer') {
    if (Array.isArray(accounts) && accounts.length >= 2) {
      operationPayload.sourceAccountId = accounts[0].id;
      operationPayload.targetAccountId = accounts[1].id;
    } else {
      return null; // Пропускаем transfer, если недостаточно счетов
    }
  } else {
    if (Array.isArray(accounts) && accounts.length > 0) {
      operationPayload.accountId = accounts[0].id;
    }

    if (Array.isArray(articles) && articles.length > 0) {
      let filteredArticles = articles.filter(a => a && a.type === operationType);
      if (filteredArticles.length > 0) {
        operationPayload.articleId = filteredArticles[0].id;
      } else {
        operationPayload.articleId = articles[0].id;
      }
    }
  }

  // Установка ID контрагента (опционально)
  if (Array.isArray(counterparties) && counterparties.length > 0) {
    operationPayload.counterpartyId = counterparties[0].id;
  }

  let createOpRes = http.post(`${BASE_URL}/api/operations`, JSON.stringify(operationPayload), headers);
  return createOpRes;
}

// Сценарий 1: Просмотр (70% пользователей)
function viewerScenario(headers) {
  group('Viewer - Browsing', function () {
    // Просмотр дашборда
    let dashboardRes = http.get(`${BASE_URL}/api/reports/dashboard`, headers);
    check(dashboardRes, {
      'dashboard loaded': (r) => r.status === 200
    });
    sleep(Math.random() * 2 + 1); // 1-3 секунды

    // Просмотр операций (с пагинацией)
    let opsRes = http.get(`${BASE_URL}/api/operations?limit=20`, headers);
    check(opsRes, {
      'operations list loaded': (r) => r.status === 200
    });
    sleep(Math.random() * 1 + 0.5); // 0.5-1.5 секунды

    // Просмотр справочников (только чтение)
    let accountsRes = http.get(`${BASE_URL}/api/accounts`, headers);
    check(accountsRes, {
      'accounts loaded': (r) => r.status === 200
    });
    sleep(0.3);

    let articlesRes = http.get(`${BASE_URL}/api/articles`, headers);
    check(articlesRes, {
      'articles loaded': (r) => r.status === 200
    });
    sleep(0.3);

    // Иногда просматривают отчеты (20% вероятности)
    if (Math.random() < 0.2) {
      let cashflowRes = http.get(`${BASE_URL}/api/reports/cashflow`, headers);
      check(cashflowRes, {
        'cashflow report loaded': (r) => r.status === 200
      });
      sleep(1);
    }

    // Просмотр операций с фильтрами (30% вероятности)
    if (Math.random() < 0.3) {
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      const dateFromStr = dateFrom.toISOString().split('T')[0];
      
      let filteredOpsRes = http.get(`${BASE_URL}/api/operations?dateFrom=${dateFromStr}&limit=50`, headers);
      check(filteredOpsRes, {
        'filtered operations loaded': (r) => r.status === 200
      });
    }
  });
}

// Сценарий 2: Оператор (20% пользователей)
function operatorScenario(headers) {
  group('Operator - Creating/Editing Operations', function () {
    // Сначала просматриваем дашборд (как обычный пользователь)
    let dashboardRes = http.get(`${BASE_URL}/api/reports/dashboard`, headers);
    check(dashboardRes, {
      'dashboard loaded': (r) => r.status === 200
    });
    sleep(Math.random() * 2 + 1); // 1-3 секунды

    // Получаем справочники для создания операций
    let accountsRes = http.get(`${BASE_URL}/api/accounts`, headers);
    let accounts = parseJsonResponse(accountsRes);
    sleep(0.5);

    let articlesRes = http.get(`${BASE_URL}/api/articles`, headers);
    let articles = parseJsonResponse(articlesRes);
    sleep(0.5);

    let counterpartiesRes = http.get(`${BASE_URL}/api/counterparties`, headers);
    let counterparties = parseJsonResponse(counterpartiesRes);
    sleep(0.5);

    // Не все операторы создают операции сразу - добавляем случайную задержку
    // Это имитирует реальное поведение, когда пользователи думают перед созданием
    sleep(Math.random() * 3 + 1); // 1-4 секунды "размышления"

    // Создаем 1-2 операции (не все сразу!)
    // Вероятность создания: 70% операторов создают операции
    if (Math.random() < 0.7) {
      const operationsCount = Math.floor(Math.random() * 2) + 1; // 1-2 операции
      let createdCount = 0;
      
      for (let i = 0; i < operationsCount; i++) {
        let createRes = createOperation(headers, accounts, articles, counterparties);
        if (createRes && (createRes.status === 200 || createRes.status === 201)) {
          createdCount++;
        }
        // Реалистичная задержка между созданием операций (пользователь заполняет форму)
        sleep(Math.random() * 3 + 2); // 2-5 секунд между операциями
      }
      
      check(null, {
        'operations created': () => createdCount > 0
      });

      // Просматриваем созданные операции
      sleep(Math.random() * 2 + 1); // 1-3 секунды
      let opsRes = http.get(`${BASE_URL}/api/operations?limit=10`, headers);
      let operations = parseJsonResponse(opsRes);
      sleep(1);

      // Иногда редактируем одну операцию (30% вероятности)
      if (Math.random() < 0.3 && Array.isArray(operations) && operations.length > 0) {
        let randomOp = operations[Math.floor(Math.random() * operations.length)];
        if (randomOp && randomOp.id) {
          let updatePayload = {
            description: `Updated by load test - ${new Date().toISOString()}`
          };
          let updateRes = http.patch(`${BASE_URL}/api/operations/${randomOp.id}`,
            JSON.stringify(updatePayload), headers);
          check(updateRes, {
            'operation updated': (r) => r.status === 200
          });
        }
      }
    } else {
      // 30% операторов просто просматривают операции без создания
      let opsRes = http.get(`${BASE_URL}/api/operations?limit=20`, headers);
      check(opsRes, {
        'operations list loaded': (r) => r.status === 200
      });
    }
  });
}

// Сценарий 3: Планировщик (5% пользователей)
function plannerScenario(headers) {
  group('Planner - Working with Plans', function () {
    // Просмотр планов
    let plansRes = http.get(`${BASE_URL}/api/plans`, headers);
    check(plansRes, {
      'plans loaded': (r) => r.status === 200
    });
    sleep(Math.random() * 2 + 1); // 1-3 секунды

    // Просмотр бюджетов
    let budgetsRes = http.get(`${BASE_URL}/api/budgets`, headers);
    check(budgetsRes, {
      'budgets loaded': (r) => r.status === 200
    });
    sleep(Math.random() * 2 + 1);

    // Просмотр дашборда для планирования
    let dashboardRes = http.get(`${BASE_URL}/api/reports/dashboard`, headers);
    check(dashboardRes, {
      'dashboard loaded': (r) => r.status === 200
    });
    sleep(1);
  });
}

// Сценарий 4: Аналитик (5% пользователей)
function analystScenario(headers) {
  group('Analyst - Viewing Reports', function () {
    // Сначала просматриваем дашборд
    let dashboardRes = http.get(`${BASE_URL}/api/reports/dashboard`, headers);
    check(dashboardRes, {
      'dashboard loaded': (r) => r.status === 200
    });
    sleep(Math.random() * 2 + 1); // 1-3 секунды

    // Не все аналитики запрашивают все отчеты одновременно
    // Распределяем нагрузку: каждый аналитик смотрит 1-2 отчета
    
    const reports = ['cashflow', 'bdds'];
    const selectedReports = [];
    
    // Выбираем случайные отчеты (1-2 из 2)
    if (Math.random() < 0.5) {
      // Смотрим оба отчета
      selectedReports.push(...reports);
    } else {
      // Смотрим только один случайный отчет
      selectedReports.push(reports[Math.floor(Math.random() * reports.length)]);
    }

    for (let report of selectedReports) {
      let reportRes = http.get(`${BASE_URL}/api/reports/${report}`, headers);
      check(reportRes, {
        [`${report} report loaded`]: (r) => r.status === 200
      });
      // Реалистичная задержка - аналитик изучает отчет
      sleep(Math.random() * 3 + 2); // 2-5 секунд на изучение
    }

    // Фильтрованные запросы операций (не всегда)
    if (Math.random() < 0.6) {
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      const dateFromStr = dateFrom.toISOString().split('T')[0];

      let filteredOpsRes = http.get(`${BASE_URL}/api/operations?dateFrom=${dateFromStr}&type=expense&limit=50`, headers);
      check(filteredOpsRes, {
        'filtered operations loaded': (r) => r.status === 200
      });
      sleep(1);

      // Иногда смотрим доходы
      if (Math.random() < 0.5) {
        let incomeOpsRes = http.get(`${BASE_URL}/api/operations?type=income&limit=50`, headers);
        check(incomeOpsRes, {
          'income operations loaded': (r) => r.status === 200
        });
      }
    }
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
    return;
  }

  if (!session || !session.data) {
    console.log(`Failed to start session. Status: ${sessionRes.status}`);
    return;
  }

  let { accessToken } = session.data;
  let headers = authHeaders(accessToken);

  // Проверка успешного создания сессии
  check(sessionRes, {
    'session created': (r) => r.status === 201,
    'has access token': () => !!accessToken
  });

  // Определяем тип пользователя на основе случайного числа
  const random = Math.random();
  let userType;
  
  if (random < USER_SCENARIOS.VIEWER) {
    userType = 'VIEWER';
  } else if (random < USER_SCENARIOS.VIEWER + USER_SCENARIOS.OPERATOR) {
    userType = 'OPERATOR';
  } else if (random < USER_SCENARIOS.VIEWER + USER_SCENARIOS.OPERATOR + USER_SCENARIOS.PLANNER) {
    userType = 'PLANNER';
  } else {
    userType = 'ANALYST';
  }

  // Выполняем сценарий в зависимости от типа пользователя
  switch (userType) {
    case 'VIEWER':
      viewerScenario(headers);
      break;
    case 'OPERATOR':
      operatorScenario(headers);
      break;
    case 'PLANNER':
      plannerScenario(headers);
      break;
    case 'ANALYST':
      analystScenario(headers);
      break;
  }

  // Пауза для имитации реальной активности между итерациями
  // Разные типы пользователей имеют разные паттерны активности
  let pauseDuration;
  switch (userType) {
    case 'VIEWER':
      pauseDuration = Math.random() * 4 + 2; // 2-6 секунд (чаще просматривают)
      break;
    case 'OPERATOR':
      pauseDuration = Math.random() * 6 + 4; // 4-10 секунд (думают перед действиями)
      break;
    case 'PLANNER':
      pauseDuration = Math.random() * 8 + 5; // 5-13 секунд (долго работают с данными)
      break;
    case 'ANALYST':
      pauseDuration = Math.random() * 10 + 5; // 5-15 секунд (изучают отчеты)
      break;
    default:
      pauseDuration = Math.random() * 5 + 3; // 3-8 секунд
  }
  sleep(pauseDuration);
}
