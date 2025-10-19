import axios from 'axios';
import { config } from '../config/env';

export const apiClient = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - добавление JWT токена
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - теперь не нужен, так как RTK Query сам обрабатывает 401
// apiClient.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     // Логика рефреша токенов перенесена в baseQueryWithReauth в RTK Query
//     return Promise.reject(error);
//   }
// );
