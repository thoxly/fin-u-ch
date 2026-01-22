import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL } from './common.js';

// Метрики для отслеживания производительности обновления
const updateDuration = new Trend('db_update_duration');
const updateSuccessRate = new Rate('db_update_success');
const updateConflicts = new Counter('db_update_conflicts');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Разгон
    { duration: '3m', target: 20 },   // Базовая нагрузка
    { duration: '2m', target: 50 },    // Увеличение
    { duration: '5m', target: 50 },     // Удержание
    { duration: '2m', target: 0 },     // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    'db_update_duration': ['p(95)<300'],
    'db_update_success': ['rate>0.99'],
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

  // Получаем список операций для обновления
  let opsRes = http.get(`${BASE_URL}/api/operations?limit=50`, headers);
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

  // Тест 1: Одиночные UPDATE операции
  group('Single Updates', function () {
    for (let i = 0; i < Math.min(5, operations.length); i++) {
      const op = operations[i];
      if (!op || !op.id) continue;

      const payload = {
        description: `Updated ${i} - ${new Date().toISOString()}`
      };

      const startTime = Date.now();
      let res = http.patch(
        `${BASE_URL}/api/operations/${op.id}`,
        JSON.stringify(payload),
        headers
      );
      const duration = Date.now() - startTime;

      updateDuration.add(duration);
      if (res.status === 200) {
        updateSuccessRate.add(1);
      } else {
        updateSuccessRate.add(0);
        if (res.status === 409) {
          updateConflicts.add(1);
        }
      }

      check(res, {
        'operation updated': (r) => r.status === 200,
        'update fast': () => duration < 300
      });

      sleep(0.2);
    }
  });

  // Тест 2: Множественные UPDATE одной записи (проверка блокировок)
  group('Concurrent Updates - Same Record', function () {
    if (operations.length === 0) return;

    const targetOp = operations[0];
    if (!targetOp || !targetOp.id) return;

    // Пытаемся обновить одну и ту же запись несколько раз подряд
    for (let i = 0; i < 3; i++) {
      const payload = {
        description: `Concurrent update attempt ${i} - ${new Date().toISOString()}`
      };

      const startTime = Date.now();
      let res = http.patch(
        `${BASE_URL}/api/operations/${targetOp.id}`,
        JSON.stringify(payload),
        headers
      );
      updateDuration.add(Date.now() - startTime);

      if (res.status === 200) {
        updateSuccessRate.add(1);
      } else if (res.status === 409) {
        updateConflicts.add(1);
        updateSuccessRate.add(0);
      } else {
        updateSuccessRate.add(0);
      }

      sleep(0.1);
    }
  });

  // Тест 3: UPDATE разных полей
  group('Partial Updates', function () {
    for (let i = 0; i < Math.min(3, operations.length); i++) {
      const op = operations[i];
      if (!op || !op.id) continue;

      // Обновляем только описание
      const payload1 = {
        description: `Partial update 1 - ${new Date().toISOString()}`
      };

      let res1 = http.patch(
        `${BASE_URL}/api/operations/${op.id}`,
        JSON.stringify(payload1),
        headers
      );
      updateSuccessRate.add(res1.status === 200);

      sleep(0.1);

      // Обновляем сумму (если возможно)
      const payload2 = {
        amount: op.amount + 100
      };

      let res2 = http.patch(
        `${BASE_URL}/api/operations/${op.id}`,
        JSON.stringify(payload2),
        headers
      );
      updateSuccessRate.add(res2.status === 200);

      check(res1, {
        'partial update 1': (r) => r.status === 200
      });
      check(res2, {
        'partial update 2': (r) => r.status === 200
      });

      sleep(0.2);
    }
  });

  // Тест 4: UPDATE с валидацией (неправильные данные)
  group('Update Validation', function () {
    if (operations.length === 0) return;

    const op = operations[0];
    if (!op || !op.id) return;

    // Попытка обновить с отрицательной суммой (должна быть отклонена)
    const invalidPayload = {
      amount: -1000
    };

    let res = http.patch(
      `${BASE_URL}/api/operations/${op.id}`,
      JSON.stringify(invalidPayload),
      headers
    );

    check(res, {
      'invalid update rejected': (r) => r.status === 400 || r.status === 422
    });
  });

  sleep(0.5);
}
