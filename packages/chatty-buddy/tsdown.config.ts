import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['lib/types/index.js'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: false,
  clean: false,
});
