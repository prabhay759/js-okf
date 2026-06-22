---
type: module
title: Special Files
description: 'Manage the two optional OKF special files: index.md (concept listing) and log.md (append-only changelog)'
resource: src/special.ts
tags:
  - index
  - log
  - special-files
timestamp: '2026-06-22T17:12:42.888Z'
---

## Location

`src/special.ts`

## Functions

### `updateIndex(bundleRoot, conceptIds)` → `Promise<void>`

1. For each concept id: reads its matter to get `title`
2. Groups concepts by top-level directory (part before first `/`)
3. Concepts with no `/` in id go into group `''` (no heading)
4. Writes `index.md` with:
   - Frontmatter: `{ type: 'index', timestamp: nowISO() }`
   - Body: grouped markdown with `## <dir>` headings and `- [title](./id.md)` links

### `appendLog(bundleRoot, entry)` → `Promise<void>`

1. Reads existing `log.md` (empty string if `ENOENT`)
2. Builds log line: `- <timestamp> [action] [conceptId]: message`
   - `timestamp`: `entry.timestamp ?? nowISO()`
   - Parts joined with space, only included if defined
3. **First call** (file empty): writes full file with `{ type: 'log', timestamp: nowISO() }` frontmatter
4. **Subsequent calls**: `existing.trimEnd() + '\n' + line + '\n'` — appends without touching frontmatter

## Why these are "special"

They are excluded from `bundle.list()` results by default (via `SPECIAL_IDS` set in `bundle.ts`).
They are also not subject to the upsert flow — they have their own dedicated write logic.
