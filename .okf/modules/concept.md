---
type: module
title: Concept I/O
description: Core async filesystem operations — read, write, and upsert individual OKF concept files
resource: src/concept.ts
tags:
  - core
  - filesystem
  - upsert
timestamp: '2026-06-22T17:12:42.888Z'
---

## Location

`src/concept.ts`

## Functions

### `readConcept(filePath, id)` → `Promise<OKFConcept | null>`
Reads a `.md` file and parses it via `frontmatter.parseConcept`.
Returns `null` on `ENOENT`. Re-throws all other errors.

### `writeConcept(filePath, matter, body)` → `Promise<void>`
Serializes and writes. Parent directory must already exist.

### `upsertConcept(bundleRoot, input)` → `Promise<UpsertResult>`

**Decision tree:**

```
1. normalizeId(input.id)          → strips .md, leading /, backslashes
2. idToFilePath(bundleRoot, id)   → absolute .md path
3. readConcept(filePath, id)

   existing === null  →  CREATE
     matter = { ...input.matter, timestamp: nowISO() }
     body   = input.body ?? ''
     ensureDir(dirname(filePath))
     writeConcept(...)
     return { created: true, ... }

   existing !== null  →  UPDATE
     merged = mergeMatter(existing.matter, input.matter)
     merged.timestamp = nowISO()
     body = bodyStrategy === 'preserve'
            ? existing.body
            : (input.body ?? existing.body)
     writeConcept(...)
     return { created: false, ... }
```

## Important behaviors

- Parent directories are always created on CREATE (never on UPDATE since file exists)
- `timestamp` is always set by `upsertConcept`, never trusted from `input.matter`
- `tags` union-merge happens inside `mergeMatter`, not here
