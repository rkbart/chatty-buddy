import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export interface ManifestFile {
  hash: string;
  ingestedAt: string;
  chunks: number;
  size: number;
}

export interface Manifest {
  version: number;
  lastScan: string;
  files: Record<string, ManifestFile>;
}

export async function loadManifest(dataDir: string): Promise<Manifest> {
  const manifestPath = join(dataDir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    return { version: 1, lastScan: new Date().toISOString(), files: {} };
  }

  const content = await readFile(manifestPath, 'utf-8');
  return JSON.parse(content);
}

export async function saveManifest(dataDir: string, manifest: Manifest): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const manifestPath = join(dataDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

export function calculateFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function hasFileChanged(manifest: Manifest, filename: string, currentHash: string): boolean {
  const existing = manifest.files[filename];
  return !existing || existing.hash !== currentHash;
}

export function getIngestedFiles(manifest: Manifest): string[] {
  return Object.keys(manifest.files);
}

export function removeFileFromManifest(manifest: Manifest, filename: string): void {
  delete manifest.files[filename];
}

export function addFileToManifest(
  manifest: Manifest,
  filename: string,
  hash: string,
  chunks: number,
  size: number
): void {
  manifest.files[filename] = {
    hash,
    ingestedAt: new Date().toISOString(),
    chunks,
    size,
  };
  manifest.lastScan = new Date().toISOString();
}
