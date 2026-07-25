import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { cssMinify: 'lightningcss', minify: 'terser', modulePreload: { polyfill: false } },
});
