import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['packages/chatty-buddy/src/index.ts'],
  outDir: 'packages/chatty-buddy/dist',
  format: ['esm', 'cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
});
