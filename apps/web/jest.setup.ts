import '@testing-library/jest-dom';

// Mock Vite environment variables
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3000/api',
        DEV: true,
        PROD: false,
      },
    },
  },
});
