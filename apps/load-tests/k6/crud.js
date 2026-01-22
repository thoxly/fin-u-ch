import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, login, authHeaders } from './common.js';

export const options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS) : 50,
  duration: __ENV.K6_DURATION || '3m',
};

function unique(name) {
  return `${name}-${__VU}-${Date.now()}`;
}

export default function () {
  const token = login();
  if (!token) {
    console.log('Failed to obtain token for CRUD operations');
    return;
  }

  // Используем реальные эндпоинты: /api/deals
  // CREATE
  const payload = JSON.stringify({ name: unique('deal'), amount: Math.floor(Math.random() * 1000) });
  let res = http.post(`${BASE_URL}/api/deals`, payload, authHeaders(token));

  check(res, {
    'create deal 201': (r) => {
      const success = r.status === 201 || r.status === 200;
      if (!success) {
        console.log(`Create deal failed with status: ${r.status}`);
        console.log(`Response body: ${r.body}`);
      }
      return success;
    }
  });

  let id = null;
  try {
    id = res.json().id;
    if (!id) {
      console.log(`No ID found in create response: ${r.body}`);
    }
  } catch (e) {
    console.log(`Failed to parse JSON response for create: ${e.message}`);
    console.log(`Response body: ${r.body}`);
  }

  // LIST
  res = http.get(`${BASE_URL}/api/deals`, authHeaders(token));
  check(res, {
    'deals list 200': (r) => {
      const success = r.status === 200;
      if (!success) {
        console.log(`Deals list failed with status: ${r.status}`);
        console.log(`Response body: ${r.body}`);
      }
      return success;
    }
  });

  // GET, UPDATE, DELETE только если ID был успешно получен
  if (id) {
    // GET
    res = http.get(`${BASE_URL}/api/deals/${id}`, authHeaders(token));
    check(res, {
      'get deal 200': (r) => {
        const success = r.status === 200;
        if (!success) {
          console.log(`Get deal failed with status: ${r.status}`);
          console.log(`Response body: ${r.body}`);
        }
        return success;
      }
    });

    // UPDATE
    const upd = JSON.stringify({ amount: Math.floor(Math.random() * 2000) });
    res = http.patch(`${BASE_URL}/api/deals/${id}`, upd, authHeaders(token));
    check(res, {
      'patch deal 200': (r) => {
        const success = r.status === 200;
        if (!success) {
          console.log(`Update deal failed with status: ${r.status}`);
          console.log(`Response body: ${r.body}`);
        }
        return success;
      }
    });

    // DELETE
    res = http.del(`${BASE_URL}/api/deals/${id}`, null, authHeaders(token));
    check(res, {
      'delete deal 200/204': (r) => {
        const success = r.status === 200 || r.status === 204;
        if (!success) {
          console.log(`Delete deal failed with status: ${r.status}`);
          console.log(`Response body: ${r.body}`);
        }
        return success;
      }
    });
  } else {
    console.log('Skipping GET/UPDATE/DELETE operations due to missing ID');
  }

  sleep(1);
}
