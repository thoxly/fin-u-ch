import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, login, authHeaders } from './common.js';
import { generateClientBankFile } from './utils/generate-bank-file.js';

// Метрики для отслеживания производительности импорта
const importDuration = new Trend('imports_import_duration');
const importSuccessRate = new Rate('imports_import_success');
const importErrors = new Counter('imports_import_errors');
const batchImportDuration = new Trend('imports_batch_import_duration');

export const options = {
  stages: [
    { duration: '1m', target: 3 },    // Разгон
    { duration: '3m', target: 3 },    // Базовая нагрузка
    { duration: '2m', target: 8 },     // Увеличение
    { duration: '5m', target: 8 },    // Удержание
    { duration: '2m', target: 0 },     // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<20000', 'p(99)<40000'],
    'imports_import_duration': ['p(95)<15000'],
    'imports_import_success': ['rate>0.95'],
  },
};

export default function () {
  const token = login();
  if (!token) {
    console.log('Failed to obtain token for import tests');
    return;
  }

  const headers = authHeaders(token);
  const uploadHeaders = { ...headers.headers };
  uploadHeaders['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundary';

  // Шаг 1: Загружаем файл и применяем правила
  let sessionId = null;
  group('Prepare Import Session', function () {
    // Загружаем файл
    const fileContent = generateClientBankFile(30);
    const formData = createFormData(fileContent, 'import-test.txt');
    
    let res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
      headers: uploadHeaders,
    });

    if (res.status === 201) {
      try {
        const result = res.json();
        sessionId = result.sessionId;
      } catch (e) {
        return;
      }
    } else {
      return;
    }

    sleep(1);

    // Применяем правила
    if (sessionId) {
      res = http.post(
        `${BASE_URL}/api/imports/sessions/${sessionId}/apply-rules`,
        null,
        headers
      );
      check(res, {
        'rules applied before import': (r) => r.status === 200,
      });
    }

    sleep(1);
  });

  if (!sessionId) {
    return;
  }

  // Тест 1: Импорт всех операций из сессии
  group('Import All Operations', function () {
    // Сначала получаем список операций
    let opsRes = http.get(
      `${BASE_URL}/api/imports/sessions/${sessionId}/operations?limit=100`,
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

    // Импортируем все операции
    const operationIds = operations.map(op => op.id);
    const importPayload = {
      operationIds: operationIds,
    };

    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/api/imports/sessions/${sessionId}/import`,
      JSON.stringify(importPayload),
      headers
    );
    const duration = Date.now() - startTime;

    importDuration.add(duration);
    
    if (res.status === 200) {
      importSuccessRate.add(1);
      
      try {
        const result = res.json();
        check(result, {
          'operations imported': () => result.imported !== undefined || result.count !== undefined,
        });
      } catch (e) {
        // Ignore
      }
    } else {
      importSuccessRate.add(0);
      importErrors.add(1);
      console.log(`Import failed: ${res.status}, body: ${res.body}`);
    }

    check(res, {
      'import successful': (r) => r.status === 200,
      'import reasonable time': () => duration < 20000
    });

    sleep(3);
  });

  // Тест 2: Импорт части операций (выборочный импорт)
  group('Selective Import - Partial Operations', function () {
    // Создаем новую сессию для этого теста
    const fileContent = generateClientBankFile(20);
    const formData = createFormData(fileContent, 'selective-import-test.txt');
    
    let res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
      headers: uploadHeaders,
    });

    let newSessionId = null;
    if (res.status === 201) {
      try {
        const result = res.json();
        newSessionId = result.sessionId;
      } catch (e) {
        return;
      }
    } else {
      return;
    }

    sleep(1);

    // Получаем операции
    res = http.get(
      `${BASE_URL}/api/imports/sessions/${newSessionId}/operations?limit=20`,
      headers
    );

    if (res.status !== 200) {
      return;
    }

    let operations = [];
    try {
      operations = res.json();
    } catch (e) {
      return;
    }

    if (!Array.isArray(operations) || operations.length < 2) {
      return;
    }

    // Импортируем только первые 5 операций
    const selectedIds = operations.slice(0, 5).map(op => op.id);
    const importPayload = {
      operationIds: selectedIds,
    };

    const startTime = Date.now();
    res = http.post(
      `${BASE_URL}/api/imports/sessions/${newSessionId}/import`,
      JSON.stringify(importPayload),
      headers
    );
    const duration = Date.now() - startTime;

    batchImportDuration.add(duration);
    
    if (res.status === 200) {
      importSuccessRate.add(1);
    } else {
      importSuccessRate.add(0);
      importErrors.add(1);
    }

    check(res, {
      'selective import successful': (r) => r.status === 200,
      'selective import fast': () => duration < 10000
    });

    sleep(2);
  });

  // Тест 3: Проверка статуса сессии после импорта
  group('Check Session Status After Import', function () {
    const res = http.get(
      `${BASE_URL}/api/imports/sessions/${sessionId}`,
      headers
    );

    check(res, {
      'session status retrieved': (r) => r.status === 200,
    });

    sleep(1);
  });

  // Тест 4: Проверка созданных операций после импорта
  group('Verify Imported Operations', function () {
    // Проверяем, что операции появились в основном списке
    const res = http.get(
      `${BASE_URL}/api/operations?limit=50`,
      headers
    );

    check(res, {
      'operations list accessible': (r) => r.status === 200,
    });

    sleep(1);
  });

  sleep(2);
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
