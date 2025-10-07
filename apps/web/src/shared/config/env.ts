export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
