import { defineConfig } from 'tsup';

export default defineConfig([
  // Browser entry (React component)
  {
    entry: ['src/browser.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    external: ['react', 'react-dom', 'react-markdown'],
    clean: true,
    sourcemap: false,
  },
  // Server entry (full exports including server)
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    outDir: 'dist',
    outExtension: () => ({ js: '.server.js' }),
    external: [
      'react',
      'react-dom',
      'react-markdown',
      'express',
      'cors',
      'better-sqlite3',
      'mammoth',
      'pdf-parse',
      'chromadb',
    ],
    sourcemap: false,
    splitting: false,
  },
  // CLI server entry (bundled, with runtime deps as external)
  {
    entry: ['bin/server.ts'],
    format: ['esm'],
    dts: false,
    outDir: 'dist',
    outExtension: () => ({ js: '.cli.js' }),
    platform: 'node',
    target: 'node18',
    external: [
      'better-sqlite3',
      'express',
      'cors',
      'mammoth',
      'pdf-parse',
      'chromadb',
    ],
    sourcemap: false,
    splitting: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
