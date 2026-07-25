import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { cssMinify: 'lightningcss', minify: 'terser', modulePreload: { polyfill: false } },
  test: { include: ['src/**/*.test.ts'] },
});
