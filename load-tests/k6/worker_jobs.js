import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './common.js';

export const options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS) : 30,
  duration: __ENV.K6_DURATION || '2m',
};

// Этот скрипт использует публичный demo endpoint для создания временной сессии
// и затем вызывает защищённый маршрут для проверки токена.
export default function () {
  // Создаём demo-сессию (возвращает { success: true, data: { accessToken, ... } })
  const resDemo = http.post(`${BASE_URL}/api/demo/start-session`);

  // Проверяем, что запрос выполнен успешно
  if (resDemo.status !== 200 && resDemo.status !== 201) {
    console.log(`Demo session failed with status: ${resDemo.status}`);
    console.log(`Response body: ${resDemo.body}`);
    return;
  }

  let accessToken = null;
  try {
    const jsonData = resDemo.json();
    // Проверяем различные возможные структуры ответа
    accessToken = jsonData.data?.accessToken ||
                  jsonData.accessToken ||
                  jsonData.token ||
                  jsonData.data?.token ||
                  null;
  } catch (e) {
    console.log(`Failed to parse JSON response: ${e.message}`);
    console.log(`Response body: ${resDemo.body}`);
    return;
  }

  if (!accessToken) {
    console.log('No access token found in response');
    console.log(`Response body: ${resDemo.body}`);
    return;
  }

  // Вызываем защищённый маршрут, например, получить информацию о пользователе
  const res = http.get(`${BASE_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  check(res, {
    'users.me with demo token 200': (r) => {
      const success = r.status === 200;
      if (!success) {
        console.log(`Protected route failed with status: ${r.status}`);
        console.log(`Response body: ${r.body}`);
      }
      return success;
    }
  });

  sleep(0.5);
}
