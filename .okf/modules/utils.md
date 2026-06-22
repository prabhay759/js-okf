---
type: module
title: Utilities
description: ID normalization, path construction, ISO timestamps, and directory creation
resource: src/utils.ts
tags:
  - utils
  - helpers
timestamp: '2026-06-22T17:12:42.888Z'
---

## Location

`src/utils.ts`

## Functions

### `normalizeId(id)` → `string`
```ts
id.replace(/^\/+/, '')     // strip leading slashes
  .replace(/\.md$/, '')    // strip .md suffix
  .replace(/\\/g, '/')    // normalize Windows backslashes
```

### `idToFilePath(bundleRoot, id)` → `string`
```ts
path.join(bundleRoot, normalizeId(id) + '.md')
```

### `nowISO()` → `string`
```ts
new Date().toISOString()
```

### `ensureDir(dir)` → `Promise<void>`
```ts
await mkdir(dir, { recursive: true })
```
Idempotent — no error if directory already exists.

## Notes

- `normalizeId` is called in `upsertConcept` and `OKFBundle.read` before every file operation
- `idToFilePath` always produces an absolute path when given an absolute `bundleRoot`
