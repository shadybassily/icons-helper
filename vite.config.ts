/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages is /icons-helper/; Netlify and local dev are /
  base: process.env.GITHUB_ACTIONS ? '/icons-helper/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
});
