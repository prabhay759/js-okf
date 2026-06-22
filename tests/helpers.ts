import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function tmpBundleDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'js-okf-test-'))
}

export function cleanupDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

export function readRaw(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

export function writeRaw(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, content, 'utf8')
}
