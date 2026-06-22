import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { OKFBundle } from '../src/bundle.js'
import { tmpBundleDir, cleanupDir, writeRaw } from './helpers.js'

let dir: string

beforeEach(() => {
  dir = tmpBundleDir()
})

afterEach(() => {
  cleanupDir(dir)
})

describe('OKFBundle constructor', () => {
  it('creates root dir when createIfMissing: true', () => {
    const nonExistent = path.join(dir, 'new-bundle')
    new OKFBundle(nonExistent, { createIfMissing: true })
    expect(existsSync(nonExistent)).toBe(true)
  })

  it('creates parent dirs automatically on first upsert even without createIfMissing', async () => {
    const nonExistent = path.join(dir, 'ghost-bundle')
    const bundle = new OKFBundle(nonExistent)
    const result = await bundle.upsert({ id: 'test', matter: { type: 'doc' } })
    expect(existsSync(nonExistent)).toBe(true)
    expect(result.created).toBe(true)
  })
})

describe('OKFBundle.upsert', () => {
  it('creates a file on disk', async () => {
    const bundle = new OKFBundle(dir)
    const result = await bundle.upsert({ id: 'hello', matter: { type: 'doc', title: 'Hello' } })
    expect(existsSync(result.filePath)).toBe(true)
    expect(result.created).toBe(true)
  })

  it('updates an existing concept', async () => {
    const bundle = new OKFBundle(dir)
    await bundle.upsert({ id: 'doc', matter: { type: 'doc' } })
    const result = await bundle.upsert({ id: 'doc', matter: { type: 'doc', title: 'Updated' } })
    expect(result.created).toBe(false)
    expect(result.concept.matter.title).toBe('Updated')
  })
})

describe('OKFBundle.upsertMany', () => {
  it('processes all inputs and returns array of results', async () => {
    const bundle = new OKFBundle(dir)
    const results = await bundle.upsertMany([
      { id: 'a', matter: { type: 'doc' } },
      { id: 'b', matter: { type: 'doc' } },
      { id: 'c/d', matter: { type: 'table' } },
    ])
    expect(results).toHaveLength(3)
    expect(results.every((r) => r.created)).toBe(true)
    expect(results.map((r) => r.id)).toEqual(expect.arrayContaining(['a', 'b', 'c/d']))
  })
})

describe('OKFBundle.read', () => {
  it('returns null for missing concept', async () => {
    const bundle = new OKFBundle(dir)
    const result = await bundle.read('missing')
    expect(result).toBeNull()
  })

  it('returns concept for existing file', async () => {
    writeRaw(path.join(dir, 'hello.md'), `---\ntype: doc\ntitle: Hello\n---\n\nBody.\n`)
    const bundle = new OKFBundle(dir)
    const result = await bundle.read('hello')
    expect(result).not.toBeNull()
    expect(result!.matter.title).toBe('Hello')
    expect(result!.body).toBe('Body.')
  })
})

describe('OKFBundle.list', () => {
  beforeEach(async () => {
    const bundle = new OKFBundle(dir)
    await bundle.upsertMany([
      { id: 'alpha', matter: { type: 'doc' } },
      { id: 'group/beta', matter: { type: 'doc' } },
      { id: 'group/sub/gamma', matter: { type: 'doc' } },
    ])
    await bundle.updateIndex()
    await bundle.appendLog({ message: 'init' })
  })

  it('returns ids excluding special files by default', async () => {
    const bundle = new OKFBundle(dir)
    const ids = await bundle.list()
    expect(ids).toContain('alpha')
    expect(ids).toContain('group/beta')
    expect(ids).toContain('group/sub/gamma')
    expect(ids).not.toContain('index')
    expect(ids).not.toContain('log')
  })

  it('includes special files when excludeSpecial: false', async () => {
    const bundle = new OKFBundle(dir)
    const ids = await bundle.list({ excludeSpecial: false })
    expect(ids).toContain('index')
    expect(ids).toContain('log')
  })

  it('works with deeply nested directory structure', async () => {
    const bundle = new OKFBundle(dir)
    const ids = await bundle.list()
    expect(ids).toContain('group/sub/gamma')
  })

  it('returns empty array when bundle dir does not exist', async () => {
    const emptyBundle = new OKFBundle(path.join(dir, 'nonexistent'))
    const ids = await emptyBundle.list()
    expect(ids).toEqual([])
  })
})

describe('OKFBundle.updateIndex', () => {
  it('writes index.md with type: index in frontmatter', async () => {
    const bundle = new OKFBundle(dir)
    await bundle.upsert({ id: 'doc', matter: { type: 'doc', title: 'My Doc' } })
    await bundle.updateIndex()

    const indexConcept = await bundle.read('index')
    expect(indexConcept).not.toBeNull()
    expect(indexConcept!.matter.type).toBe('index')
  })

  it('index.md body contains links to concepts', async () => {
    const bundle = new OKFBundle(dir)
    await bundle.upsert({ id: 'my-doc', matter: { type: 'doc', title: 'My Doc' } })
    await bundle.updateIndex()

    const indexConcept = await bundle.read('index')
    expect(indexConcept!.body).toContain('my-doc.md')
  })
})

describe('OKFBundle.appendLog', () => {
  it('creates log.md on first call', async () => {
    const bundle = new OKFBundle(dir)
    await bundle.appendLog({ message: 'initialized repo' })
    expect(existsSync(path.join(dir, 'log.md'))).toBe(true)
  })

  it('log.md has type: log frontmatter', async () => {
    const bundle = new OKFBundle(dir)
    await bundle.appendLog({ message: 'first entry' })
    const logConcept = await bundle.read('log')
    expect(logConcept!.matter.type).toBe('log')
  })

  it('appends on subsequent calls without losing existing frontmatter', async () => {
    const bundle = new OKFBundle(dir)
    await bundle.appendLog({ message: 'first' })
    await bundle.appendLog({ message: 'second' })

    const logConcept = await bundle.read('log')
    expect(logConcept!.body).toContain('first')
    expect(logConcept!.body).toContain('second')
    expect(logConcept!.matter.type).toBe('log')
  })
})
