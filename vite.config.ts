import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      '@tryretool/custom-component-support': path.resolve(__dirname, 'src/mock-retool.ts')
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        testHarness: path.resolve(__dirname, 'test-harness.html'),
      },
    },
  },
});
