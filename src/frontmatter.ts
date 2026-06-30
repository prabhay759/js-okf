import matter from 'gray-matter'
import { dump as yamlDump } from 'js-yaml'
import type { OKFConcept, OKFMatter } from './types.js'
import { OKFMissingTypeError } from './errors.js'

export function parseConcept(id: string, raw: string, filePath: string): OKFConcept {
  const parsed = matter(raw)
  const frontmatter = parsed.data as Record<string, unknown>

  if (typeof frontmatter['type'] !== 'string' || frontmatter['type'].trim() === '') {
    throw new OKFMissingTypeError(filePath)
  }

  const okfMatter: OKFMatter = {
    ...(frontmatter as OKFMatter),
    type: frontmatter['type'] as string,
  }

  return {
    id,
    matter: okfMatter,
    body: parsed.content.trim(),
    path: filePath,
  }
}

export function mergeMatter(existing: OKFMatter, incoming: OKFMatter): OKFMatter {
  const merged: OKFMatter = { ...existing, ...incoming }

  // Union-merge tags without duplicates
  if (existing.tags !== undefined || incoming.tags !== undefined) {
    const existingTags = existing.tags ?? []
    const incomingTags = incoming.tags ?? []
    merged.tags = Array.from(new Set([...existingTags, ...incomingTags]))
  }

  // timestamp is always set by caller — strip it from incoming so caller controls it
  delete merged.timestamp

  return merged
}

export function serializeConcept(okfMatter: OKFMatter, body: string): string {
  const fm = yamlDump(okfMatter, { lineWidth: -1 }).trimEnd()
  const bodySection = body.trim() ? '\n' + body.trim() + '\n' : ''
  return `---\n${fm}\n---\n${bodySection}`
}
