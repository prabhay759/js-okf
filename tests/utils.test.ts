import { describe, it, expect, afterEach } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { normalizeId, idToFilePath, nowISO, ensureDir } from '../src/utils.js'
import { tmpBundleDir, cleanupDir } from './helpers.js'

describe('normalizeId', () => {
  it('strips leading slash', () => {
    expect(normalizeId('/foo/bar')).toBe('foo/bar')
  })

  it('strips multiple leading slashes', () => {
    expect(normalizeId('///foo/bar')).toBe('foo/bar')
  })

  it('strips .md suffix', () => {
    expect(normalizeId('foo/bar.md')).toBe('foo/bar')
  })

  it('normalizes backslashes', () => {
    expect(normalizeId('foo\\bar')).toBe('foo/bar')
  })

  it('handles combination of all normalizations', () => {
    expect(normalizeId('/foo\\bar.md')).toBe('foo/bar')
  })

  it('returns unchanged simple id', () => {
    expect(normalizeId('tables/users')).toBe('tables/users')
  })
})

describe('idToFilePath', () => {
  it('returns absolute path under bundleRoot', () => {
    const root = '/tmp/bundle'
    expect(idToFilePath(root, 'tables/users')).toBe(path.join(root, 'tables/users.md'))
  })

  it('normalizes id before joining', () => {
    const root = '/tmp/bundle'
    expect(idToFilePath(root, '/tables/users.md')).toBe(path.join(root, 'tables/users.md'))
  })
})

describe('nowISO', () => {
  it('returns a valid ISO 8601 string', () => {
    const ts = nowISO()
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(new Date(ts).toISOString()).toBe(ts)
  })
})

describe('ensureDir', () => {
  let dir: string

  afterEach(() => {
    if (dir) cleanupDir(dir)
  })

  it('creates nested directories', async () => {
    dir = tmpBundleDir()
    const nested = path.join(dir, 'a', 'b', 'c')
    await ensureDir(nested)
    expect(existsSync(nested)).toBe(true)
  })

  it('does not throw if directory already exists', async () => {
    dir = tmpBundleDir()
    await ensureDir(dir)
    await expect(ensureDir(dir)).resolves.toBeUndefined()
  })
})
