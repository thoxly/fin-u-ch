import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, login, authHeaders } from './common.js';
import { generateClientBankFile } from './utils/generate-bank-file.js';

// Метрики для отслеживания производительности загрузки
const uploadDuration = new Trend('imports_upload_duration');
const uploadSuccessRate = new Rate('imports_upload_success');
const uploadErrors = new Counter('imports_upload_errors');
const parseDuration = new Trend('imports_parse_duration');

export const options = {
  stages: [
    { duration: '1m', target: 5 },    // Разгон (загрузка файлов тяжелая)
    { duration: '3m', target: 5 },    // Базовая нагрузка
    { duration: '2m', target: 15 },   // Увеличение
    { duration: '5m', target: 15 },   // Удержание
    { duration: '2m', target: 0 },    // Снижение
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Допускаем больше ошибок для загрузки файлов
    http_req_duration: ['p(95)<10000', 'p(99)<20000'], // Загрузка может быть медленнее
    'imports_upload_duration': ['p(95)<8000'],
    'imports_upload_success': ['rate>0.95'],
  },
};

export default function () {
  const token = login();
  if (!token) {
    console.log('Failed to obtain token for import tests');
    return;
  }

  const headers = authHeaders(token);
  headers.headers['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundary';

  // Тест 1: Загрузка маленького файла (10 операций)
  group('Small File Upload - 10 operations', function () {
    const fileContent = generateClientBankFile(10);
    const formData = createFormData(fileContent, 'small-statement.txt');
    
    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
      headers: {
        ...headers.headers,
        'Content-Type': formData.contentType,
      },
    });
    const duration = Date.now() - startTime;

    uploadDuration.add(duration);
    parseDuration.add(duration);
    
    if (res.status === 201) {
      uploadSuccessRate.add(1);
      
      try {
        const result = res.json();
        check(result, {
          'session created': () => result.sessionId !== undefined,
          'operations count correct': () => result.operationsCount === 10,
        });
      } catch (e) {
        console.log('Failed to parse upload response:', e.message);
      }
    } else {
      uploadSuccessRate.add(0);
      uploadErrors.add(1);
      console.log(`Upload failed with status: ${res.status}`);
      console.log(`Response: ${res.body}`);
    }

    check(res, {
      'small file uploaded': (r) => r.status === 201,
      'upload reasonable time': () => duration < 10000
    });

    sleep(2);
  });

  // Тест 2: Загрузка среднего файла (100 операций)
  group('Medium File Upload - 100 operations', function () {
    const fileContent = generateClientBankFile(100);
    const formData = createFormData(fileContent, 'medium-statement.txt');
    
    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
      headers: {
        ...headers.headers,
        'Content-Type': formData.contentType,
      },
    });
    const duration = Date.now() - startTime;

    uploadDuration.add(duration);
    
    if (res.status === 201) {
      uploadSuccessRate.add(1);
    } else {
      uploadSuccessRate.add(0);
      uploadErrors.add(1);
    }

    check(res, {
      'medium file uploaded': (r) => r.status === 201,
      'medium upload reasonable time': () => duration < 15000
    });

    sleep(3);
  });

  // Тест 3: Загрузка большого файла (500 операций)
  group('Large File Upload - 500 operations', function () {
    const fileContent = generateClientBankFile(500);
    const formData = createFormData(fileContent, 'large-statement.txt');
    
    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
      headers: {
        ...headers.headers,
        'Content-Type': formData.contentType,
      },
    });
    const duration = Date.now() - startTime;

    uploadDuration.add(duration);
    
    if (res.status === 201) {
      uploadSuccessRate.add(1);
      
      try {
        const result = res.json();
        check(result, {
          'large file session created': () => result.sessionId !== undefined,
          'large file operations count': () => result.operationsCount === 500,
        });
      } catch (e) {
        // Ignore
      }
    } else {
      uploadSuccessRate.add(0);
      uploadErrors.add(1);
    }

    check(res, {
      'large file uploaded': (r) => r.status === 201,
      'large upload reasonable time': () => duration < 30000
    });

    sleep(5);
  });

  // Тест 4: Загрузка очень большого файла (1000 операций)
  group('Very Large File Upload - 1000 operations', function () {
    const fileContent = generateClientBankFile(1000);
    const formData = createFormData(fileContent, 'very-large-statement.txt');
    
    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
      headers: {
        ...headers.headers,
        'Content-Type': formData.contentType,
      },
    });
    const duration = Date.now() - startTime;

    uploadDuration.add(duration);
    
    if (res.status === 201) {
      uploadSuccessRate.add(1);
    } else {
      uploadSuccessRate.add(0);
      uploadErrors.add(1);
    }

    check(res, {
      'very large file uploaded': (r) => r.status === 201,
      'very large upload reasonable time': () => duration < 60000
    });

    sleep(5);
  });

  // Тест 5: Проверка валидации размера файла (попытка загрузить слишком большой файл)
  group('File Size Validation', function () {
    // Генерируем файл с 5000+ операциями (должен быть отклонен)
    const fileContent = generateClientBankFile(5001);
    const formData = createFormData(fileContent, 'too-large-statement.txt');
    
    const res = http.post(`${BASE_URL}/api/imports/upload`, formData.body, {
      headers: {
        ...headers.headers,
        'Content-Type': formData.contentType,
      },
    });

    check(res, {
      'too large file rejected': (r) => r.status === 400 || r.status === 413,
    });

    sleep(1);
  });

  sleep(2);
}

/**
 * Создает multipart/form-data для загрузки файла
 */
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
