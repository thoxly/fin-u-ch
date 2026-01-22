import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './common.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 1000 }, // spike up
    { duration: '60s', target: 1000 }, // sustain
    { duration: '30s', target: 10 },
  ],
};

export default function () {
  const res = http.get(`${BASE_URL}/api/deals`);
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
  sleep(0.1);
}
