/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^cn$/, replacement: path.resolve(__dirname, './src/lib/cn.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.agents/**', '**/e2e/**'],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        monitor: path.resolve(__dirname, 'monitor.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'react';
          if (id.includes('node_modules/radix-ui') || id.includes('node_modules/@radix-ui')) return 'radix';
          if (id.includes('node_modules/cmdk')) return 'cmdk';
        },
      },
    },
  },
});
