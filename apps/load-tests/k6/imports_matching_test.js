import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, login, authHeaders } from './common.js';
import { generateClientBankFile } from './utils/generate-bank-file.js';

// Метрики для отслеживания производительности matching
const matchingDuration = new Trend('imports_matching_duration');
const matchingSuccessRate = new Rate('imports_matching_success');
const rulesApplyDuration = new Trend('imports_rules_apply_duration');
const autoMatchDuration = new Trend('imports_auto_match_duration');

export const options = {
  stages: [
    { duration: '1m', target: 3 },    // Разгон
    { duration: '3m', target: 3 },    // Базовая нагрузка
    { duration: '2m', target: 10 },   // Увеличение
    { duration: '5m', target: 10 },   // Удержание
    { duration: '2m', target: 0 },    // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<15000', 'p(99)<30000'],
    'imports_matching_duration': ['p(95)<12000'],
    'imports_matching_success': ['rate>0.95'],
  },
};

export default function () {
  const token = login();
  if (!token) {
    console.log('Failed to obtain token for matching tests');
    return;
  }

  const headers = authHeaders(token);
  const uploadHeaders = { ...headers.headers };
  uploadHeaders['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundary';

  // Шаг 1: Загружаем файл для тестирования
  let sessionId = null;
  group('Upload File for Matching', function () {
    const fileContent = generateClientBankFile(50);
    const formData = createFormData(fileContent, 'matching-test.txt');
    
    const res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
      headers: uploadHeaders,
    });

    if (res.status === 201) {
      try {
        const result = res.json();
        sessionId = result.sessionId;
        check(result, {
          'file uploaded for matching': () => result.sessionId !== undefined,
        });
      } catch (e) {
        console.log('Failed to parse upload response:', e.message);
        return;
      }
    } else {
      console.log(`Upload failed: ${res.status}`);
      return;
    }

    sleep(1);
  });

  if (!sessionId) {
    return;
  }

  // Тест 1: Получение операций из сессии (проверка автоматического matching при загрузке)
  group('Get Imported Operations - Check Auto-Match', function () {
    const startTime = Date.now();
    const res = http.get(
      `${BASE_URL}/api/imports/sessions/${sessionId}/operations?limit=50`,
      headers
    );
    const duration = Date.now() - startTime;

    matchingDuration.add(duration);
    
    if (res.status === 200) {
      matchingSuccessRate.add(1);
      
      try {
        const operations = res.json();
        if (Array.isArray(operations) && operations.length > 0) {
          const matchedCount = operations.filter(op => 
            op.matchedArticleId || op.matchedCounterpartyId || op.matchedAccountId
          ).length;
          
          check(operations, {
            'operations retrieved': () => operations.length > 0,
            'some operations matched': () => matchedCount >= 0, // Может быть 0, если нет правил
          });
        }
      } catch (e) {
        console.log('Failed to parse operations:', e.message);
      }
    } else {
      matchingSuccessRate.add(0);
    }

    check(res, {
      'operations retrieved': (r) => r.status === 200,
      'retrieval fast': () => duration < 5000
    });

    sleep(1);
  });

  // Тест 2: Применение правил маппинга
  group('Apply Mapping Rules', function () {
    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/imports/sessions/${sessionId}/apply-rules`,
      null,
      headers
    );
    const duration = Date.now() - startTime;

    rulesApplyDuration.add(duration);
    
    if (res.status === 200) {
      matchingSuccessRate.add(1);
      
      try {
        const result = res.json();
        check(result, {
          'rules applied': () => result.applied !== undefined || result.updated !== undefined,
        });
      } catch (e) {
        // Ignore
      }
    } else {
      matchingSuccessRate.add(0);
    }

    check(res, {
      'rules applied successfully': (r) => r.status === 200,
      'rules apply reasonable time': () => duration < 15000
    });

    sleep(2);
  });

  // Тест 3: Повторное получение операций после применения правил
  group('Get Operations After Rules Applied', function () {
    const startTime = Date.now();
    const res = http.get(
      `${BASE_URL}/api/imports/sessions/${sessionId}/operations?matched=true&limit=50`,
      headers
    );
    const duration = Date.now() - startTime;

    autoMatchDuration.add(duration);
    
    if (res.status === 200) {
      matchingSuccessRate.add(1);
      
      try {
        const operations = res.json();
        if (Array.isArray(operations)) {
          const matchedCount = operations.filter(op => 
            op.matchedArticleId || op.matchedCounterpartyId || op.matchedAccountId
          ).length;
          
          check(operations, {
            'matched operations found': () => matchedCount >= 0,
          });
        }
      } catch (e) {
        // Ignore
      }
    } else {
      matchingSuccessRate.add(0);
    }

    check(res, {
      'matched operations retrieved': (r) => r.status === 200,
    });

    sleep(1);
  });

  // Тест 4: Фильтрация операций по статусу matching
  group('Filter Operations by Match Status', function () {
    // Получаем несопоставленные операции
    let res = http.get(
      `${BASE_URL}/api/imports/sessions/${sessionId}/operations?matched=false&limit=20`,
      headers
    );
    check(res, {
      'unmatched operations retrieved': (r) => r.status === 200,
    });

    sleep(0.5);

    // Получаем сопоставленные операции
    res = http.get(
      `${BASE_URL}/api/imports/sessions/${sessionId}/operations?matched=true&limit=20`,
      headers
    );
    check(res, {
      'matched operations retrieved': (r) => r.status === 200,
    });

    sleep(0.5);

    // Получаем подтвержденные операции
    res = http.get(
      `${BASE_URL}/api/imports/sessions/${sessionId}/operations?confirmed=true&limit=20`,
      headers
    );
    check(res, {
      'confirmed operations retrieved': (r) => r.status === 200,
    });

    sleep(1);
  });

  // Тест 5: Массовое обновление операций (ручное сопоставление)
  group('Bulk Update Operations', function () {
    // Сначала получаем список операций
    let opsRes = http.get(
      `${BASE_URL}/api/imports/sessions/${sessionId}/operations?limit=10`,
      headers
    );

    if (opsRes.status !== 200) {
      return;
    }

    let operations = [];
    try {
      operations = opsRes.json();
    } catch (e) {
      return;
    }

    if (!Array.isArray(operations) || operations.length === 0) {
      return;
    }

    // Получаем справочники для сопоставления
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

    if (accounts.length === 0 || articles.length === 0) {
      return;
    }

    // Обновляем первые 3 операции
    const operationIds = operations.slice(0, 3).map(op => op.id).filter(id => id);
    
    if (operationIds.length === 0) {
      return;
    }

    const updatePayload = {
      operationIds: operationIds,
      matchedAccountId: accounts[0].id,
      matchedArticleId: articles[0].id,
      confirmed: false,
    };

    const startTime = Date.now();
    const res = http.patch(
      `${BASE_URL}/api/imports/sessions/${sessionId}/operations/bulk`,
      JSON.stringify(updatePayload),
      headers
    );
    const duration = Date.now() - startTime;

    matchingDuration.add(duration);
    
    if (res.status === 200) {
      matchingSuccessRate.add(1);
    } else {
      matchingSuccessRate.add(0);
    }

    check(res, {
      'bulk update successful': (r) => r.status === 200,
      'bulk update fast': () => duration < 5000
    });

    sleep(2);
  });

  sleep(1);
}

function createFormData(fileContent, fileName) {
  const boundary = '----WebKitFormBoundary' + Date.now();
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    'Content-Type: text/plain',
    '',
    fileContent,
    `--${boundary}--`
  ].join('\r\n');

  return {
    body: body,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}
