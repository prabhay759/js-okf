import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer } from '../src/server.js'
import { upsertConcept } from '../src/concept.js'
import { tmpBundleDir, cleanupDir } from './helpers.js'

let dir: string
let port: number

beforeEach(() => {
  dir = tmpBundleDir()
  port = 3100 + Math.floor(Math.random() * 900)
})

afterEach(() => {
  cleanupDir(dir)
})

describe('createServer', () => {
  it('GET / returns 200 HTML containing js-okf', async () => {
    const srv = createServer(dir, { port })
    await srv.start()
    try {
      const res = await fetch(`http://localhost:${port}/`)
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/html')
      const html = await res.text()
      expect(html).toContain('js-okf')
    } finally {
      await srv.stop()
    }
  })

  it('GET /api/concepts returns JSON array with correct ids', async () => {
    await upsertConcept(dir, { id: 'architecture/overview', matter: { type: 'architecture', title: 'Overview' } })
    await upsertConcept(dir, { id: 'api/types', matter: { type: 'api' } })

    const srv = createServer(dir, { port })
    await srv.start()
    try {
      const res = await fetch(`http://localhost:${port}/api/concepts`)
      expect(res.status).toBe(200)
      const body = await res.json() as { items: Array<{ id: string }> }
      const ids = body.items.map((c) => c.id)
      expect(ids).toContain('architecture/overview')
      expect(ids).toContain('api/types')
    } finally {
      await srv.stop()
    }
  })

  it('GET /api/concept?id=... returns the concept', async () => {
    await upsertConcept(dir, { id: 'architecture/overview', matter: { type: 'architecture', title: 'Overview' } })

    const srv = createServer(dir, { port })
    await srv.start()
    try {
      const res = await fetch(`http://localhost:${port}/api/concept?id=architecture/overview`)
      expect(res.status).toBe(200)
      const concept = await res.json() as { matter: { type: string } }
      expect(concept.matter.type).toBe('architecture')
    } finally {
      await srv.stop()
    }
  })

  it('GET /api/concept?id=missing returns 404', async () => {
    const srv = createServer(dir, { port })
    await srv.start()
    try {
      const res = await fetch(`http://localhost:${port}/api/concept?id=does-not-exist`)
      expect(res.status).toBe(404)
    } finally {
      await srv.stop()
    }
  })

  it('stop() resolves cleanly', async () => {
    const srv = createServer(dir, { port })
    await srv.start()
    await expect(srv.stop()).resolves.toBeUndefined()
  })

  it('unknown route returns 404', async () => {
    const srv = createServer(dir, { port })
    await srv.start()
    try {
      const res = await fetch(`http://localhost:${port}/unknown-path`)
      expect(res.status).toBe(404)
    } finally {
      await srv.stop()
    }
  })
})
