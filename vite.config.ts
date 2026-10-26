/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  // GitHub Pages is /icons-helper/; Netlify and local dev are /
  base: process.env.GITHUB_ACTIONS ? '/icons-helper/' : '/',
  plugins: [react(), nodePolyfills({ include: ['buffer'], globals: { Buffer: true } })],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
});
