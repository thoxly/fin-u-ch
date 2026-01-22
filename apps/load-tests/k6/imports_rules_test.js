import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, login, authHeaders } from './common.js';

// Метрики для отслеживания производительности работы с правилами
const rulesDuration = new Trend('imports_rules_duration');
const rulesSuccessRate = new Rate('imports_rules_success');

export const options = {
  stages: [
    { duration: '1m', target: 5 },    // Разгон
    { duration: '3m', target: 5 },    // Базовая нагрузка
    { duration: '2m', target: 15 },     // Увеличение
    { duration: '5m', target: 15 },   // Удержание
    { duration: '2m', target: 0 },     // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    'imports_rules_duration': ['p(95)<800'],
    'imports_rules_success': ['rate>0.99'],
  },
};

export default function () {
  const token = login();
  if (!token) {
    console.log('Failed to obtain token for rules tests');
    return;
  }

  const headers = authHeaders(token);

  // Получаем справочники для создания правил
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

  if (accounts.length === 0 || articles.length === 0) {
    return;
  }

  let createdRuleId = null;

  // Тест 1: Получение списка правил
  group('Get Mapping Rules', function () {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/api/imports/rules`, headers);
    const duration = Date.now() - startTime;

    rulesDuration.add(duration);
    
    if (res.status === 200) {
      rulesSuccessRate.add(1);
      
      try {
        const rules = res.json();
        check(rules, {
          'rules list retrieved': () => Array.isArray(rules),
        });
      } catch (e) {
        // Ignore
      }
    } else {
      rulesSuccessRate.add(0);
    }

    check(res, {
      'rules retrieved': (r) => r.status === 200,
      'rules retrieval fast': () => duration < 1000
    });

    sleep(0.5);
  });

  // Тест 2: Создание правила для статьи
  group('Create Article Mapping Rule', function () {
    const expenseArticles = articles.filter(a => a && a.type === 'expense');
    const article = expenseArticles.length > 0 ? expenseArticles[0] : articles[0];

    const rulePayload = {
      ruleType: 'contains',
      pattern: 'Оплата услуг',
      targetType: 'article',
      targetId: article.id,
      targetName: article.name,
      sourceField: 'description',
    };

    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/imports/rules`,
      JSON.stringify(rulePayload),
      headers
    );
    const duration = Date.now() - startTime;

    rulesDuration.add(duration);
    
    if (res.status === 201) {
      rulesSuccessRate.add(1);
      
      try {
        const rule = res.json();
        createdRuleId = rule.id;
        check(rule, {
          'rule created': () => rule.id !== undefined,
        });
      } catch (e) {
        // Ignore
      }
    } else {
      rulesSuccessRate.add(0);
    }

    check(res, {
      'article rule created': (r) => r.status === 201,
      'rule creation fast': () => duration < 1000
    });

    sleep(0.5);
  });

  // Тест 3: Создание правила для контрагента
  group('Create Counterparty Mapping Rule', function () {
    if (counterparties.length === 0) {
      return;
    }

    const rulePayload = {
      ruleType: 'equals',
      pattern: 'ООО Поставщик',
      targetType: 'counterparty',
      targetId: counterparties[0].id,
      targetName: counterparties[0].name,
      sourceField: 'receiver',
    };

    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/imports/rules`,
      JSON.stringify(rulePayload),
      headers
    );
    const duration = Date.now() - startTime;

    rulesDuration.add(duration);
    
    if (res.status === 201) {
      rulesSuccessRate.add(1);
    } else {
      rulesSuccessRate.add(0);
    }

    check(res, {
      'counterparty rule created': (r) => r.status === 201,
    });

    sleep(0.5);
  });

  // Тест 4: Создание правила для счета
  group('Create Account Mapping Rule', function () {
    const rulePayload = {
      ruleType: 'equals',
      pattern: '40702810068000001468',
      targetType: 'account',
      targetId: accounts[0].id,
      targetName: accounts[0].name,
      sourceField: 'payerAccount',
    };

    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/imports/rules`,
      JSON.stringify(rulePayload),
      headers
    );
    const duration = Date.now() - startTime;

    rulesDuration.add(duration);
    
    if (res.status === 201) {
      rulesSuccessRate.add(1);
    } else {
      rulesSuccessRate.add(0);
    }

    check(res, {
      'account rule created': (r) => r.status === 201,
    });

    sleep(0.5);
  });

  // Тест 5: Создание правила с regex
  group('Create Regex Mapping Rule', function () {
    const incomeArticles = articles.filter(a => a && a.type === 'income');
    const article = incomeArticles.length > 0 ? incomeArticles[0] : articles[0];

    const rulePayload = {
      ruleType: 'regex',
      pattern: 'Оплата.*счет.*\\d+',
      targetType: 'article',
      targetId: article.id,
      targetName: article.name,
      sourceField: 'description',
    };

    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/imports/rules`,
      JSON.stringify(rulePayload),
      headers
    );
    const duration = Date.now() - startTime;

    rulesDuration.add(duration);
    
    if (res.status === 201) {
      rulesSuccessRate.add(1);
    } else {
      rulesSuccessRate.add(0);
    }

    check(res, {
      'regex rule created': (r) => r.status === 201,
    });

    sleep(0.5);
  });

  // Тест 6: Получение правил с фильтрами
  group('Get Rules with Filters', function () {
    // Фильтр по типу цели
    let res = http.get(
      `${BASE_URL}/api/imports/rules?targetType=article`,
      headers
    );
    check(res, {
      'rules filtered by target type': (r) => r.status === 200,
    });

    sleep(0.3);

    // Фильтр по полю источника
    res = http.get(
      `${BASE_URL}/api/imports/rules?sourceField=description`,
      headers
    );
    check(res, {
      'rules filtered by source field': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // Тест 7: Обновление правила
  group('Update Mapping Rule', function () {
    if (!createdRuleId) {
      return;
    }

    const updatePayload = {
      pattern: 'Оплата товаров и услуг',
    };

    const startTime = Date.now();
    const res = http.patch(
      `${BASE_URL}/api/imports/rules/${createdRuleId}`,
      JSON.stringify(updatePayload),
      headers
    );
    const duration = Date.now() - startTime;

    rulesDuration.add(duration);
    
    if (res.status === 200) {
      rulesSuccessRate.add(1);
    } else {
      rulesSuccessRate.add(0);
    }

    check(res, {
      'rule updated': (r) => r.status === 200,
      'rule update fast': () => duration < 1000
    });

    sleep(0.5);
  });

  // Тест 8: Удаление правила
  group('Delete Mapping Rule', function () {
    if (!createdRuleId) {
      return;
    }

    const startTime = Date.now();
    const res = http.del(
      `${BASE_URL}/api/imports/rules/${createdRuleId}`,
      null,
      headers
    );
    const duration = Date.now() - startTime;

    rulesDuration.add(duration);
    
    if (res.status === 200 || res.status === 204) {
      rulesSuccessRate.add(1);
    } else {
      rulesSuccessRate.add(0);
    }

    check(res, {
      'rule deleted': (r) => r.status === 200 || r.status === 204,
      'rule deletion fast': () => duration < 1000
    });

    sleep(0.5);
  });

  sleep(1);
}
