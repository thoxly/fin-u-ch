import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure we're in browser environment
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'development'
    ),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/dist'),
      '@fin-u-ch/shared': path.resolve(__dirname, '../../packages/shared/dist'),
    },
  },
  optimizeDeps: {
    include: ['@fin-u-ch/shared'],
    force: true, // Force re-optimization to pick up new exports
    exclude: ['crypto'], // Exclude Node.js crypto module
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Exclude Node.js crypto module from browser bundle
        if (id === 'crypto' || id.startsWith('crypto/')) {
          return true;
        }
        return false;
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
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
