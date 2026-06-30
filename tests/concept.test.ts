import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { readConcept, upsertConcept } from '../src/concept.js'
import { tmpBundleDir, cleanupDir, writeRaw } from './helpers.js'

let dir: string

beforeEach(() => {
  dir = tmpBundleDir()
})

afterEach(() => {
  cleanupDir(dir)
})

describe('readConcept', () => {
  it('returns null for non-existent concept', async () => {
    const result = await readConcept(dir, 'missing')
    expect(result).toBeNull()
  })

  it('returns parsed concept for existing file', async () => {
    writeRaw(path.join(dir, 'hello.md'), `---\ntype: doc\ntitle: Hello\n---\n\nBody text.\n`)
    const result = await readConcept(dir, 'hello')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('hello')
    expect(result!.matter.type).toBe('doc')
    expect(result!.matter.title).toBe('Hello')
    expect(result!.body).toBe('Body text.')
    expect(result!.path).toBe(path.join(dir, 'hello.md'))
  })
})

describe('upsertConcept', () => {
  it('creates new file with created: true', async () => {
    const result = await upsertConcept(dir, {
      id: 'hello',
      matter: { type: 'doc', title: 'Hello' },
    })
    expect(result.created).toBe(true)
    expect(existsSync(result.filePath)).toBe(true)
  })

  it('creates nested directories automatically', async () => {
    const result = await upsertConcept(dir, {
      id: 'tables/users',
      matter: { type: 'table' },
    })
    expect(existsSync(path.join(dir, 'tables'))).toBe(true)
    expect(existsSync(result.filePath)).toBe(true)
    expect(result.id).toBe('tables/users')
  })

  it('sets timestamp on create', async () => {
    const before = new Date().toISOString()
    const result = await upsertConcept(dir, { id: 'ts-test', matter: { type: 'doc' } })
    const after = new Date().toISOString()
    const ts = result.concept.matter.timestamp!
    expect(ts >= before).toBe(true)
    expect(ts <= after).toBe(true)
  })

  it('returns concept with correct matter in result', async () => {
    const result = await upsertConcept(dir, {
      id: 'my-concept',
      matter: { type: 'api', title: 'My API', tags: ['v1'] },
      body: 'Some docs.',
    })
    expect(result.concept.matter.type).toBe('api')
    expect(result.concept.matter.title).toBe('My API')
    expect(result.concept.matter.tags).toEqual(['v1'])
    expect(result.concept.body).toBe('Some docs.')
  })

  it('updates existing file with created: false', async () => {
    await upsertConcept(dir, { id: 'existing', matter: { type: 'doc' } })
    const result = await upsertConcept(dir, {
      id: 'existing',
      matter: { type: 'doc', title: 'Updated' },
    })
    expect(result.created).toBe(false)
    expect(result.concept.matter.title).toBe('Updated')
  })

  it('merges tags on update without losing existing tags', async () => {
    await upsertConcept(dir, { id: 'tagged', matter: { type: 'doc', tags: ['a', 'b'] } })
    const result = await upsertConcept(dir, {
      id: 'tagged',
      matter: { type: 'doc', tags: ['b', 'c'] },
    })
    expect(result.concept.matter.tags).toEqual(expect.arrayContaining(['a', 'b', 'c']))
    expect(result.concept.matter.tags).toHaveLength(3)
  })

  it('always refreshes timestamp on update', async () => {
    const first = await upsertConcept(dir, { id: 'ts', matter: { type: 'doc' } })
    await new Promise((r) => setTimeout(r, 5))
    const second = await upsertConcept(dir, { id: 'ts', matter: { type: 'doc' } })
    expect(second.concept.matter.timestamp! > first.concept.matter.timestamp!).toBe(true)
  })

  it('replaces body by default on update', async () => {
    await upsertConcept(dir, { id: 'body', matter: { type: 'doc' }, body: 'Old body.' })
    const result = await upsertConcept(dir, {
      id: 'body',
      matter: { type: 'doc' },
      body: 'New body.',
    })
    expect(result.concept.body).toBe('New body.')
  })

  it('preserves body when bodyStrategy is preserve', async () => {
    await upsertConcept(dir, { id: 'preserve', matter: { type: 'doc' }, body: 'Original body.' })
    const result = await upsertConcept(dir, {
      id: 'preserve',
      matter: { type: 'doc' },
      body: 'This should be ignored.',
      bodyStrategy: 'preserve',
    })
    expect(result.concept.body).toBe('Original body.')
  })

  it('resolves id with .md suffix to same file as without', async () => {
    const r1 = await upsertConcept(dir, { id: 'tables/users', matter: { type: 'table' } })
    const r2 = await upsertConcept(dir, {
      id: 'tables/users.md',
      matter: { type: 'table', title: 'Updated' },
    })
    expect(r1.filePath).toBe(r2.filePath)
    expect(r2.created).toBe(false)
  })

  it('resolves id with leading slash correctly', async () => {
    const r1 = await upsertConcept(dir, { id: 'foo', matter: { type: 'doc' } })
    const r2 = await upsertConcept(dir, {
      id: '/foo',
      matter: { type: 'doc', title: 'Slash' },
    })
    expect(r1.filePath).toBe(r2.filePath)
    expect(r2.created).toBe(false)
  })
})
