import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/dist'),
      '@fin-u-ch/shared': path.resolve(__dirname, '../../packages/shared/dist'),
    },
  },
  optimizeDeps: {
    include: ['@fin-u-ch/shared'],
    force: false, // Set to true if you need to force re-optimization
  },
  server: {
    port: 5173,
    watch: {
      // Watch for changes in the shared package
      ignored: ['!**/node_modules/@fin-u-ch/shared/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
