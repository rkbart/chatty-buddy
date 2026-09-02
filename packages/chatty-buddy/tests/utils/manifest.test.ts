import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  loadManifest,
  saveManifest,
  calculateFileHash,
  hasFileChanged,
  addFileToManifest,
  removeFileFromManifest,
  getIngestedFiles,
  type Manifest,
} from '../../src/utils/manifest.ts';

const TEST_DIR = join(import.meta.dirname, '../../tmp/test-manifest');

describe('manifest', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('loads empty manifest when file does not exist', async () => {
    const manifest = await loadManifest(TEST_DIR);
    expect(manifest.version).toBe(1);
    expect(Object.keys(manifest.files)).toHaveLength(0);
  });

  it('saves and loads manifest', async () => {
    const manifest: Manifest = {
      version: 1,
      lastScan: new Date().toISOString(),
      files: {},
    };

    await saveManifest(TEST_DIR, manifest);
    const loaded = await loadManifest(TEST_DIR);

    expect(loaded.version).toBe(1);
  });

  it('calculates file hash', () => {
    const buffer = Buffer.from('test content');
    const hash = calculateFileHash(buffer);

    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64); // SHA-256 hex string
  });

  it('detects file changes', () => {
    const manifest: Manifest = {
      version: 1,
      lastScan: new Date().toISOString(),
      files: {
        'test.txt': {
          hash: 'abc123',
          ingestedAt: new Date().toISOString(),
          chunks: 10,
          size: 1000,
        },
      },
    };

    expect(hasFileChanged(manifest, 'test.txt', 'abc123')).toBe(false);
    expect(hasFileChanged(manifest, 'test.txt', 'def456')).toBe(true);
    expect(hasFileChanged(manifest, 'new.txt', 'abc123')).toBe(true);
  });

  it('adds file to manifest', () => {
    const manifest: Manifest = {
      version: 1,
      lastScan: new Date().toISOString(),
      files: {},
    };

    addFileToManifest(manifest, 'test.txt', 'hash123', 10, 1000);

    expect(manifest.files['test.txt']).toBeTruthy();
    expect(manifest.files['test.txt'].hash).toBe('hash123');
    expect(manifest.files['test.txt'].chunks).toBe(10);
  });

  it('removes file from manifest', () => {
    const manifest: Manifest = {
      version: 1,
      lastScan: new Date().toISOString(),
      files: {
        'test.txt': {
          hash: 'abc123',
          ingestedAt: new Date().toISOString(),
          chunks: 10,
          size: 1000,
        },
      },
    };

    removeFileFromManifest(manifest, 'test.txt');

    expect(manifest.files['test.txt']).toBeUndefined();
  });

  it('gets ingested files', () => {
    const manifest: Manifest = {
      version: 1,
      lastScan: new Date().toISOString(),
      files: {
        'file1.txt': {
          hash: 'abc',
          ingestedAt: new Date().toISOString(),
          chunks: 5,
          size: 500,
        },
        'file2.txt': {
          hash: 'def',
          ingestedAt: new Date().toISOString(),
          chunks: 10,
          size: 1000,
        },
      },
    };

    const files = getIngestedFiles(manifest);

    expect(files).toHaveLength(2);
    expect(files).toContain('file1.txt');
    expect(files).toContain('file2.txt');
  });
});
