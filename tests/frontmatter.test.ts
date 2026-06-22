import { describe, it, expect } from 'vitest'
import { parseConcept, mergeMatter, serializeConcept } from '../src/frontmatter.js'
import { OKFMissingTypeError } from '../src/errors.js'
import type { OKFMatter } from '../src/types.js'

const VALID_RAW = `---
type: table
title: Users
description: User accounts
tags:
  - core
  - auth
---

Body content here.
`

describe('parseConcept', () => {
  it('parses valid frontmatter and body', () => {
    const result = parseConcept('tables/users', VALID_RAW, '/bundle/tables/users.md')
    expect(result.id).toBe('tables/users')
    expect(result.matter.type).toBe('table')
    expect(result.matter.title).toBe('Users')
    expect(result.matter.tags).toEqual(['core', 'auth'])
    expect(result.body).toBe('Body content here.')
  })

  it('parses concept with no body', () => {
    const raw = `---\ntype: doc\n---\n`
    const result = parseConcept('doc', raw, '/bundle/doc.md')
    expect(result.body).toBe('')
  })

  it('tolerates unknown custom keys', () => {
    const raw = `---\ntype: api\ncustomKey: someValue\n---\n`
    const result = parseConcept('api', raw, '/bundle/api.md')
    expect(result.matter['customKey']).toBe('someValue')
  })

  it('throws OKFMissingTypeError when type is absent', () => {
    const raw = `---\ntitle: No type here\n---\n`
    expect(() => parseConcept('doc', raw, '/bundle/doc.md')).toThrow(OKFMissingTypeError)
  })

  it('includes filePath in OKFMissingTypeError', () => {
    const raw = `---\ntitle: No type\n---\n`
    try {
      parseConcept('doc', raw, '/bundle/doc.md')
    } catch (err) {
      expect((err as OKFMissingTypeError).filePath).toBe('/bundle/doc.md')
    }
  })

  it('throws OKFMissingTypeError when type is empty string', () => {
    const raw = `---\ntype: ''\n---\n`
    expect(() => parseConcept('doc', raw, '/bundle/doc.md')).toThrow(OKFMissingTypeError)
  })
})

describe('mergeMatter', () => {
  const base: OKFMatter = {
    type: 'table',
    title: 'Old Title',
    tags: ['a', 'b'],
    timestamp: '2026-01-01T00:00:00.000Z',
    customKey: 'original',
  }

  it('overrides scalar fields from incoming', () => {
    const result = mergeMatter(base, { type: 'table', title: 'New Title' })
    expect(result.title).toBe('New Title')
  })

  it('union-merges tags without duplicates', () => {
    const result = mergeMatter(base, { type: 'table', tags: ['b', 'c'] })
    expect(result.tags).toEqual(['a', 'b', 'c'])
  })

  it('preserves custom keys from existing not in incoming', () => {
    const result = mergeMatter(base, { type: 'table' })
    expect(result['customKey']).toBe('original')
  })

  it('does not carry over timestamp from incoming', () => {
    const result = mergeMatter(base, { type: 'table', timestamp: '2099-01-01T00:00:00.000Z' })
    expect(result.timestamp).toBeUndefined()
  })

  it('handles undefined existing tags + incoming tags', () => {
    const existing: OKFMatter = { type: 'doc' }
    const result = mergeMatter(existing, { type: 'doc', tags: ['x'] })
    expect(result.tags).toEqual(['x'])
  })

  it('handles existing tags + undefined incoming tags', () => {
    const result = mergeMatter(base, { type: 'table' })
    expect(result.tags).toEqual(['a', 'b'])
  })
})

describe('serializeConcept', () => {
  it('produces --- fenced YAML frontmatter', () => {
    const matter: OKFMatter = { type: 'doc', title: 'Hello' }
    const output = serializeConcept(matter, 'Some body')
    expect(output).toMatch(/^---\n/)
    expect(output).toContain('type: doc')
    expect(output).toContain('title: Hello')
  })

  it('includes body below frontmatter', () => {
    const matter: OKFMatter = { type: 'doc' }
    const output = serializeConcept(matter, 'My body text')
    expect(output).toContain('My body text')
  })

  it('handles empty body', () => {
    const matter: OKFMatter = { type: 'doc' }
    const output = serializeConcept(matter, '')
    expect(output).toMatch(/^---\n/)
  })

  it('round-trips through parseConcept', () => {
    const matter: OKFMatter = {
      type: 'table',
      title: 'Users',
      tags: ['core', 'auth'],
      description: 'User accounts',
    }
    const body = 'Some markdown body.'
    const serialized = serializeConcept(matter, body)
    const parsed = parseConcept('tables/users', serialized, '/bundle/tables/users.md')

    expect(parsed.matter.type).toBe(matter.type)
    expect(parsed.matter.title).toBe(matter.title)
    expect(parsed.matter.tags).toEqual(matter.tags)
    expect(parsed.matter.description).toBe(matter.description)
    expect(parsed.body).toBe(body)
  })
})
