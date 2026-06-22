import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { OKFConcept, UpsertConceptInput, UpsertResult } from './types.js'
import { normalizeId, idToFilePath, nowISO, ensureDir } from './utils.js'
import { parseConcept, mergeMatter, serializeConcept } from './frontmatter.js'

export async function readConcept(filePath: string, id: string): Promise<OKFConcept | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return parseConcept(id, raw, filePath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw err
  }
}

export async function writeConcept(filePath: string, okfMatter: import('./types.js').OKFMatter, body: string): Promise<void> {
  const content = serializeConcept(okfMatter, body)
  await writeFile(filePath, content, 'utf8')
}

export async function upsertConcept(
  bundleRoot: string,
  input: UpsertConceptInput,
): Promise<UpsertResult> {
  const id = normalizeId(input.id)
  const filePath = idToFilePath(bundleRoot, id)

  const existing = await readConcept(filePath, id)

  let finalMatter: import('./types.js').OKFMatter
  let finalBody: string
  let created: boolean

  if (existing === null) {
    finalMatter = { ...input.matter, timestamp: nowISO() }
    finalBody = input.body ?? ''
    created = true
    await ensureDir(path.dirname(filePath))
  } else {
    const merged = mergeMatter(existing.matter, input.matter)
    merged.timestamp = nowISO()
    finalMatter = merged

    if (input.bodyStrategy === 'preserve') {
      finalBody = existing.body
    } else {
      finalBody = input.body !== undefined ? input.body : existing.body
    }
    created = false
  }

  await writeConcept(filePath, finalMatter, finalBody)

  const concept: OKFConcept = { id, matter: finalMatter, body: finalBody }

  return { id, filePath, created, concept }
}
