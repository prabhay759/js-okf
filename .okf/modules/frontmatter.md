---
type: module
title: Frontmatter
description: Parse, merge, and serialize YAML frontmatter using gray-matter and js-yaml
resource: src/frontmatter.ts
tags:
  - yaml
  - parsing
  - gray-matter
  - js-yaml
timestamp: '2026-06-22T17:12:42.888Z'
---

## Location

`src/frontmatter.ts`

## Dependencies

- **`gray-matter`** — parses `---\nyaml\n---\nbody` format
- **`js-yaml`** (named import: `{ dump as yamlDump }`) — serializes YAML with `lineWidth: -1`

## Functions

### `parseConcept(id, raw, filePath)` → `OKFConcept`
1. Calls `matter(raw)` to split frontmatter and body
2. Casts `parsed.data` to `Record<string, unknown>`
3. Checks `typeof frontmatter['type'] === 'string' && type.trim() !== ''`
4. Throws `OKFMissingTypeError(filePath)` if check fails
5. Returns `{ id, matter: okfMatter, body: parsed.content.trim() }`

### `mergeMatter(existing, incoming)` → `OKFMatter`
```ts
const merged = { ...existing, ...incoming }
// Tags: union-merge
if (existing.tags || incoming.tags) {
  merged.tags = Array.from(new Set([...(existing.tags ?? []), ...(incoming.tags ?? [])]))
}
// Always strip timestamp — caller sets it
delete merged.timestamp
return merged
```

**Tag union-merge rationale:** Agents annotate concepts with tags over time.
Replace semantics would silently drop tags added by previous agents.

### `serializeConcept(matter, body)` → `string`
```ts
const fm = yamlDump(matter, { lineWidth: -1 }).trimEnd()
const bodySection = body.trim() ? '\n' + body.trim() + '\n' : ''
return `---\n${fm}\n---\n${bodySection}`
```

Note: `gray-matter.stringify` was NOT used here because its `engines` option requires
a full `{ parse, stringify }` object — just passing `{ lineWidth: -1 }` caused a runtime error.
