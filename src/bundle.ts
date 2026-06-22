import { readdir } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import type { BundleOptions, ListOptions, LogEntry, OKFConcept, UpsertConceptInput, UpsertResult } from './types.js'
import { normalizeId } from './utils.js'
import { readConcept, upsertConcept } from './concept.js'
import { updateIndex, appendLog } from './special.js'

const SPECIAL_IDS = new Set(['index', 'log'])

export class OKFBundle {
  readonly root: string

  constructor(bundleRoot: string, options: BundleOptions = {}) {
    this.root = path.resolve(bundleRoot)
    if (options.createIfMissing === true) {
      mkdirSync(this.root, { recursive: true })
    }
  }

  async upsert(input: UpsertConceptInput): Promise<UpsertResult> {
    return upsertConcept(this.root, input)
  }

  async upsertMany(inputs: UpsertConceptInput[]): Promise<UpsertResult[]> {
    return Promise.all(inputs.map((input) => upsertConcept(this.root, input)))
  }

  async read(id: string): Promise<OKFConcept | null> {
    const normalId = normalizeId(id)
    const filePath = path.join(this.root, normalId + '.md')
    return readConcept(filePath, normalId)
  }

  async list(options: ListOptions = {}): Promise<string[]> {
    const excludeSpecial = options.excludeSpecial !== false

    let entries: string[]
    try {
      entries = await readdir(this.root, { recursive: true }) as string[]
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw err
    }

    return entries
      .filter((entry) => entry.endsWith('.md'))
      .map((entry) => entry.replace(/\\/g, '/').replace(/\.md$/, ''))
      .filter((id) => !excludeSpecial || !SPECIAL_IDS.has(id))
      .sort()
  }

  async updateIndex(): Promise<void> {
    const ids = await this.list({ excludeSpecial: true })
    await updateIndex(this.root, ids)
  }

  async appendLog(entry: LogEntry): Promise<void> {
    await appendLog(this.root, entry)
  }
}
