import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
    minify: 'terser',
    modulePreload: { polyfill: false },
    terserOptions: {
      compress: { passes: 3, unsafe: true, unsafe_arrows: true },
      format: { comments: false },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
