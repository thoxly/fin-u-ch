import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL } from './common.js';

export const options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS) : 20,
  duration: __ENV.K6_DURATION || '1m',
};

// Функция аутентификации с использованием конкретных учетных данных
function loginWithCredentials() {
  const email = 'Popovandrey3824@ya.ru';
  const password = '123456';
  const payload = { email, password };

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

// Функция для формирования заголовков с токеном
function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
}

export default function () {
  const token = loginWithCredentials();
  if (!token) {
    console.log('Failed to obtain token');
    return;
  }

  check(token, { 'token obtained': (t) => t !== null && t !== undefined });

  const res = http.get(`${BASE_URL}/api/users/me`, authHeaders(token));
  check(res, {
    'users.me status 200': (r) => {
      const success = r.status === 200;
      if (!success) {
        console.log(`Users.me endpoint failed with status: ${r.status}`);
        console.log(`Response body: ${r.body}`);
      }
      return success;
    }
  });
  sleep(1);
}
