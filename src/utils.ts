import { mkdir } from 'node:fs/promises'
import path from 'node:path'

export function normalizeId(id: string): string {
  return id
    .replace(/^\/+/, '')
    .replace(/\.md$/, '')
    .replace(/\\/g, '/')
}

export function idToFilePath(bundleRoot: string, id: string): string {
  return path.join(bundleRoot, normalizeId(id) + '.md')
}

export function nowISO(): string {
  return new Date().toISOString()
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}
