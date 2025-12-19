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

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {
    // do nothing
  }
  unobserve() {
    // do nothing
  }
  disconnect() {
    // do nothing
  }
};

// Mock fetch for RTK Query
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
  } as Response)
) as jest.Mock;
