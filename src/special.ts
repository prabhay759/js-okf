import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { LogEntry, OKFMatter } from './types.js'
import { nowISO, ensureDir } from './utils.js'
import { serializeConcept } from './frontmatter.js'
import { readConcept } from './concept.js'

export async function updateIndex(bundleRoot: string, conceptIds: string[]): Promise<void> {
  const groups: Record<string, Array<{ id: string; title?: string }>> = {}

  for (const id of conceptIds) {
    const filePath = path.join(bundleRoot, id + '.md')
    const concept = await readConcept(filePath, id)
    const title = concept?.matter.title

    const topLevel = id.includes('/') ? (id.split('/')[0] ?? id) : ''

    if (!(topLevel in groups)) {
      groups[topLevel] = []
    }
    if (title !== undefined) {
      groups[topLevel]!.push({ id, title })
    } else {
      groups[topLevel]!.push({ id })
    }
  }

  const lines: string[] = []

  for (const [group, concepts] of Object.entries(groups)) {
    if (group !== '') {
      lines.push(`\n## ${group}\n`)
    }
    for (const { id, title } of concepts) {
      const label = title ?? id
      const rel = './' + id + '.md'
      lines.push(`- [${label}](${rel})`)
    }
  }

  const body = lines.join('\n')
  const indexMatter: OKFMatter = { type: 'index', timestamp: nowISO() }
  const indexPath = path.join(bundleRoot, 'index.md')

  await ensureDir(bundleRoot)
  await writeFile(indexPath, serializeConcept(indexMatter, body), 'utf8')
}

export async function appendLog(bundleRoot: string, entry: LogEntry): Promise<void> {
  const logPath = path.join(bundleRoot, 'log.md')
  const timestamp = entry.timestamp ?? nowISO()

  let existing = ''
  try {
    existing = await readFile(logPath, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err
    }
  }

  const isNew = existing.trim() === ''

  let parts = [timestamp]
  if (entry.action) parts.push(entry.action)
  if (entry.conceptId) parts.push(entry.conceptId)
  const prefix = parts.join(' ')
  const line = `- ${prefix}: ${entry.message}`

  if (isNew) {
    const logMatter: OKFMatter = { type: 'log', timestamp: nowISO() }
    await ensureDir(bundleRoot)
    await writeFile(logPath, serializeConcept(logMatter, line), 'utf8')
  } else {
    const appended = existing.trimEnd() + '\n' + line + '\n'
    await writeFile(logPath, appended, 'utf8')
  }
}
