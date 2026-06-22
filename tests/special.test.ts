import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { updateIndex, appendLog } from '../src/special.js'
import { upsertConcept } from '../src/concept.js'
import { readConcept } from '../src/concept.js'
import { tmpBundleDir, cleanupDir, readRaw } from './helpers.js'

let dir: string

beforeEach(() => {
  dir = tmpBundleDir()
})

afterEach(() => {
  cleanupDir(dir)
})

describe('updateIndex', () => {
  it('writes index.md with type: index', async () => {
    await upsertConcept(dir, { id: 'doc', matter: { type: 'doc' } })
    await updateIndex(dir, ['doc'])

    const concept = await readConcept(path.join(dir, 'index.md'), 'index')
    expect(concept).not.toBeNull()
    expect(concept!.matter.type).toBe('index')
  })

  it('uses title for link text when available', async () => {
    await upsertConcept(dir, { id: 'my-doc', matter: { type: 'doc', title: 'My Document' } })
    await updateIndex(dir, ['my-doc'])

    const concept = await readConcept(path.join(dir, 'index.md'), 'index')
    expect(concept!.body).toContain('[My Document]')
    expect(concept!.body).toContain('./my-doc.md')
  })

  it('falls back to id for link text when title absent', async () => {
    await upsertConcept(dir, { id: 'no-title', matter: { type: 'doc' } })
    await updateIndex(dir, ['no-title'])

    const concept = await readConcept(path.join(dir, 'index.md'), 'index')
    expect(concept!.body).toContain('[no-title]')
    expect(concept!.body).toContain('./no-title.md')
  })

  it('groups concepts by top-level directory', async () => {
    await upsertConcept(dir, { id: 'tables/users', matter: { type: 'table' } })
    await upsertConcept(dir, { id: 'tables/posts', matter: { type: 'table' } })
    await updateIndex(dir, ['tables/users', 'tables/posts'])

    const concept = await readConcept(path.join(dir, 'index.md'), 'index')
    expect(concept!.body).toContain('## tables')
  })

  it('handles empty bundle with no concepts', async () => {
    await updateIndex(dir, [])
    expect(existsSync(path.join(dir, 'index.md'))).toBe(true)
    const concept = await readConcept(path.join(dir, 'index.md'), 'index')
    expect(concept!.matter.type).toBe('index')
  })

  it('overwrites stale index.md with updated timestamp', async () => {
    await updateIndex(dir, [])
    const ts1 = (await readConcept(path.join(dir, 'index.md'), 'index'))!.matter.timestamp
    await new Promise((r) => setTimeout(r, 5))
    await updateIndex(dir, [])
    const ts2 = (await readConcept(path.join(dir, 'index.md'), 'index'))!.matter.timestamp
    expect(ts2! > ts1!).toBe(true)
  })
})

describe('appendLog', () => {
  it('creates log.md on first call', async () => {
    await appendLog(dir, { message: 'initialized' })
    expect(existsSync(path.join(dir, 'log.md'))).toBe(true)
  })

  it('log.md has frontmatter with type: log', async () => {
    await appendLog(dir, { message: 'test' })
    const concept = await readConcept(path.join(dir, 'log.md'), 'log')
    expect(concept!.matter.type).toBe('log')
  })

  it('formats action: created in log line', async () => {
    await appendLog(dir, { message: 'new file created', action: 'created', conceptId: 'tables/users' })
    const raw = readRaw(path.join(dir, 'log.md'))
    expect(raw).toContain('created')
    expect(raw).toContain('tables/users')
    expect(raw).toContain('new file created')
  })

  it('formats action: updated in log line', async () => {
    await appendLog(dir, { message: 'docs updated', action: 'updated', conceptId: 'api/v1' })
    const raw = readRaw(path.join(dir, 'log.md'))
    expect(raw).toContain('updated')
    expect(raw).toContain('api/v1')
  })

  it('works without action or conceptId', async () => {
    await expect(appendLog(dir, { message: 'just a note' })).resolves.toBeUndefined()
    const raw = readRaw(path.join(dir, 'log.md'))
    expect(raw).toContain('just a note')
  })

  it('accumulates multiple entries in order', async () => {
    await appendLog(dir, { message: 'first entry' })
    await appendLog(dir, { message: 'second entry' })
    await appendLog(dir, { message: 'third entry' })

    const raw = readRaw(path.join(dir, 'log.md'))
    const firstIdx = raw.indexOf('first entry')
    const secondIdx = raw.indexOf('second entry')
    const thirdIdx = raw.indexOf('third entry')

    expect(firstIdx).toBeLessThan(secondIdx)
    expect(secondIdx).toBeLessThan(thirdIdx)
  })

  it('subsequent calls do not modify existing frontmatter', async () => {
    await appendLog(dir, { message: 'entry one' })
    const before = await readConcept(path.join(dir, 'log.md'), 'log')
    await appendLog(dir, { message: 'entry two' })
    const after = await readConcept(path.join(dir, 'log.md'), 'log')
    expect(after!.matter.type).toBe(before!.matter.type)
  })
})
