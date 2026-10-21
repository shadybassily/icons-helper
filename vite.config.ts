/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages lives at /icons-helper/; local `npm run dev` stays at /
  base: process.env.CI ? '/icons-helper/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
});
