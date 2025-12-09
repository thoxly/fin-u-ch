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

// Polyfill minimal fetch/Request/Response for RTK Query tests in Node environment
if (
  typeof (globalThis as unknown as { fetch?: unknown }).fetch === 'undefined'
) {
  // Minimal types for the polyfill
  type MinimalResponse = {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
  };

  type MinimalRequest = {
    input: unknown;
    init?: unknown;
  };

  // Assign a minimal fetch implementation that returns a MinimalResponse
  (
    globalThis as unknown as {
      fetch?: (input: unknown, init?: unknown) => Promise<MinimalResponse>;
    }
  ).fetch = async (_input: unknown, _init?: unknown) => {
    return {
      ok: false,
      status: 501,
      json: async () => ({}),
      text: async () => '',
    } as MinimalResponse;
  };

  // Minimal Request/Response constructors used by some fetch implementations
  (
    globalThis as unknown as {
      Request?: new (input: unknown, init?: unknown) => MinimalRequest;
    }
  ).Request = function (this: MinimalRequest, input: unknown, init?: unknown) {
    this.input = input;
    this.init = init;
  } as unknown;

  (
    globalThis as unknown as {
      Response?: new () => MinimalResponse;
    }
  ).Response = class {
    ok = false;
    status = 501;
    async json() {
      return {} as unknown;
    }
    async text() {
      return '';
    }
  } as unknown;
}
