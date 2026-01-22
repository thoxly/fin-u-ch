import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, login, authHeaders } from './common.js';
import { generateClientBankFile } from './utils/generate-bank-file.js';

// Метрики для полного процесса импорта
const fullFlowDuration = new Trend('imports_full_flow_duration');
const fullFlowSuccessRate = new Rate('imports_full_flow_success');
const flowErrors = new Counter('imports_full_flow_errors');

export const options = {
  stages: [
    { duration: '1m', target: 2 },    // Разгон (полный процесс долгий)
    { duration: '3m', target: 2 },    // Базовая нагрузка
    { duration: '2m', target: 5 },    // Увеличение
    { duration: '5m', target: 5 },    // Удержание
    { duration: '2m', target: 0 },   // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<30000', 'p(99)<60000'],
    'imports_full_flow_duration': ['p(95)<25000'],
    'imports_full_flow_success': ['rate>0.90'],
  },
};

export default function () {
  const token = login();
  if (!token) {
    console.log('Failed to obtain token for full flow test');
    return;
  }

  const headers = authHeaders(token);
  const uploadHeaders = { ...headers.headers };
  uploadHeaders['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundary';

  const flowStartTime = Date.now();
  let sessionId = null;

  // Полный процесс импорта: загрузка -> применение правил -> сопоставление -> импорт
  group('Full Import Flow', function () {
    // Шаг 1: Загрузка файла
    group('Step 1: Upload File', function () {
      const fileContent = generateClientBankFile(25);
      const formData = createFormData(fileContent, 'full-flow-test.txt');
      
      const res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
        headers: uploadHeaders,
      });

      if (res.status === 201) {
        try {
          const result = res.json();
          sessionId = result.sessionId;
          check(result, {
            'file uploaded': () => result.sessionId !== undefined,
            'operations count correct': () => result.operationsCount === 25,
          });
        } catch (e) {
          console.log('Failed to parse upload response:', e.message);
          return;
        }
      } else {
        console.log(`Upload failed: ${res.status}`);
        flowErrors.add(1);
        return;
      }

      sleep(2);
    });

    if (!sessionId) {
      return;
    }

    // Шаг 2: Получение информации о сессии
    group('Step 2: Get Session Info', function () {
      if (!sessionId) return;
      
      const res = http.get(
        `${BASE_URL}/api/imports/sessions/${sessionId}`,
        headers
      );

      check(res, {
        'session info retrieved': (r) => r.status === 200,
      });

      sleep(1);
    });

    // Шаг 3: Получение операций из сессии
    group('Step 3: Get Imported Operations', function () {
      if (!sessionId) return;
      
      const res = http.get(
        `${BASE_URL}/api/imports/sessions/${sessionId}/operations?limit=50`,
        headers
      );

      if (res.status === 200) {
        try {
          const operations = res.json();
          check(operations, {
            'operations retrieved': () => Array.isArray(operations) && operations.length > 0,
          });
        } catch (e) {
          // Ignore
        }
      }

      check(res, {
        'operations list retrieved': (r) => r.status === 200,
      });

      sleep(1);
    });

    // Шаг 4: Применение правил маппинга
    group('Step 4: Apply Mapping Rules', function () {
      if (!sessionId) return;
      
      const res = http.post(
        `${BASE_URL}/api/imports/sessions/${sessionId}/apply-rules`,
        null,
        headers
      );

      check(res, {
        'rules applied': (r) => r.status === 200,
      });

      sleep(2);
    });

    // Шаг 5: Проверка автоматического сопоставления
    group('Step 5: Check Auto-Matching Results', function () {
      if (!sessionId) return;
      
      const res = http.get(
        `${BASE_URL}/api/imports/sessions/${sessionId}/operations?matched=true&limit=50`,
        headers
      );

      check(res, {
        'matched operations retrieved': (r) => r.status === 200,
      });

      sleep(1);
    });

    // Шаг 6: Ручное сопоставление (если нужно)
    group('Step 6: Manual Matching (if needed)', function () {
      if (!sessionId) return;
      
      // Получаем несопоставленные операции
      let opsRes = http.get(
        `${BASE_URL}/api/imports/sessions/${sessionId}/operations?matched=false&limit=5`,
        headers
      );

      if (opsRes.status === 200) {
        try {
          const operations = opsRes.json();
          
          if (Array.isArray(operations) && operations.length > 0) {
            // Получаем справочники
            let accountsRes = http.get(`${BASE_URL}/api/accounts`, headers);
            let articlesRes = http.get(`${BASE_URL}/api/articles`, headers);

            let accounts = [];
            let articles = [];

            try {
              accounts = accountsRes.json();
              articles = articlesRes.json();
            } catch (e) {
              // Ignore
            }

            if (accounts.length > 0 && articles.length > 0) {
              // Обновляем первую операцию
              const op = operations[0];
              if (op && op.id) {
                const updatePayload = {
                  matchedAccountId: accounts[0].id,
                  matchedArticleId: articles[0].id,
                  confirmed: false,
                };

                const updateRes = http.patch(
                  `${BASE_URL}/api/imports/operations/${op.id}`,
                  JSON.stringify(updatePayload),
                  headers
                );

                check(updateRes, {
                  'operation manually matched': (r) => r.status === 200,
                });
              }
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      sleep(1);
    });

    // Шаг 7: Подтверждение операций
    group('Step 7: Confirm Operations', function () {
      if (!sessionId) return;
      
      // Получаем все операции
      let opsRes = http.get(
        `${BASE_URL}/api/imports/sessions/${sessionId}/operations?limit=50`,
        headers
      );

      if (opsRes.status === 200) {
        try {
          const operations = opsRes.json();
          
          if (Array.isArray(operations) && operations.length > 0) {
            // Подтверждаем первые 5 операций
            const operationIds = operations.slice(0, 5).map(op => op.id).filter(id => id);
            
            if (operationIds.length > 0) {
              const confirmPayload = {
                operationIds: operationIds,
                confirmed: true,
              };

              const confirmRes = http.patch(
                `${BASE_URL}/api/imports/sessions/${sessionId}/operations/bulk`,
                JSON.stringify(confirmPayload),
                headers
              );

              check(confirmRes, {
                'operations confirmed': (r) => r.status === 200,
              });
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      sleep(1);
    });

    // Шаг 8: Импорт операций
    group('Step 8: Import Operations', function () {
      if (!sessionId) return;
      
      // Получаем подтвержденные операции
      let opsRes = http.get(
        `${BASE_URL}/api/imports/sessions/${sessionId}/operations?confirmed=true&limit=50`,
        headers
      );

      if (opsRes.status === 200) {
        try {
          const operations = opsRes.json();
          
          if (Array.isArray(operations) && operations.length > 0) {
            const operationIds = operations.map(op => op.id).filter(id => id);
            
            if (operationIds.length > 0) {
              const importPayload = {
                operationIds: operationIds,
              };

              const importRes = http.post(
                `${BASE_URL}/api/imports/sessions/${sessionId}/import`,
                JSON.stringify(importPayload),
                headers
              );

              if (importRes.status === 200) {
                fullFlowSuccessRate.add(1);
              } else {
                fullFlowSuccessRate.add(0);
                flowErrors.add(1);
              }

              check(importRes, {
                'operations imported': (r) => r.status === 200,
              });
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      sleep(2);
    });

    // Шаг 9: Проверка финального статуса
    group('Step 9: Verify Final Status', function () {
      if (!sessionId) return;
      
      // Проверяем статус сессии
      let res = http.get(
        `${BASE_URL}/api/imports/sessions/${sessionId}`,
        headers
      );
      check(res, {
        'final session status retrieved': (r) => r.status === 200,
      });

      sleep(0.5);

      // Проверяем, что операции появились в основном списке
      res = http.get(
        `${BASE_URL}/api/operations?limit=10`,
        headers
      );
      check(res, {
        'imported operations in main list': (r) => r.status === 200,
      });

      sleep(1);
    });
  });

  const flowDuration = Date.now() - flowStartTime;
  fullFlowDuration.add(flowDuration);

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
