import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.K6_HOST || 'https://vect-a.ru';
// Базовая функция аутентификации. Ожидает, что в окружении заданы
// K6_TEST_USER / K6_TEST_EMAIL и K6_TEST_PASS или что caller передаст credentials.
export function login(creds) {
  const email = __ENV.K6_TEST_EMAIL || __ENV.K6_TEST_USER || 'test@example.com';
  const password = __ENV.K6_TEST_PASS || 'password';
  const payload = creds || { email, password };

  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(res, {
    'login status 200': (r) => {
      const success = r.status === 200;
      if (!success) {
        console.log(`Login failed with status: ${r.status}`);
        console.log(`Request payload: ${JSON.stringify(payload)}`);
        console.log(`Response body: ${r.body}`);
      }
      return success;
    }
  });

  let token = null;
  try {
    const j = res.json();
    // auth service возвращает { accessToken, refreshToken, user }
    token = j.accessToken || j.token || (j.data && j.data.accessToken) || null;

    if (!token) {
      console.log(`Token not found in response. Available fields: ${Object.keys(j)}`);
      console.log(`Response body: ${JSON.stringify(j)}`);
    }
  } catch (e) {
    console.log(`Failed to parse login response JSON: ${e.message}`);
    console.log(`Response body: ${res.body}`);
  }

  return token;
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
}
