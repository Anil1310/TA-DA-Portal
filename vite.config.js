import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    legalComments: 'none'
  },
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'BhartiApp',
        inlineDynamicImports: true
      }
    }
  },
  server: {
    port: 3000,
    open: false
  }
});
