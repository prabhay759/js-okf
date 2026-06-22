---
type: module
title: OKFBundle Class
description: Main stateful API — wraps a bundle directory and exposes all read/write operations
resource: src/bundle.ts
tags:
  - api
  - class
  - bundle
timestamp: '2026-06-22T17:12:42.888Z'
---

## Location

`src/bundle.ts`

## Constructor

```ts
new OKFBundle(bundleRoot: string, options?: BundleOptions)
```

- Resolves `bundleRoot` to an absolute path
- If `options.createIfMissing: true`, calls `mkdirSync` synchronously
- Does NOT throw if directory is missing (fail-at-use semantics)

## Methods

### `upsert(input)` → `Promise<UpsertResult>`
Delegates to `upsertConcept(this.root, input)`.

### `upsertMany(inputs)` → `Promise<UpsertResult[]>`
Runs `Promise.all` over all inputs — parallel upserts.

### `read(id)` → `Promise<OKFConcept | null>`
Normalizes the id, builds the file path, delegates to `readConcept`.

### `list(options?)` → `Promise<string[]>`
Uses `fs.readdir` with `{ recursive: true }` (Node 18+), filters `.md` files,
strips the bundle root prefix and `.md` suffix. Excludes `index` and `log` by default.
Returns `[]` if bundle root does not exist.

### `updateIndex()` → `Promise<void>`
Calls `this.list()` then `special.updateIndex(this.root, ids)`.

### `appendLog(entry)` → `Promise<void>`
Delegates to `special.appendLog(this.root, entry)`.

## Key constant

`SPECIAL_IDS = new Set(['index', 'log'])` — used to filter special files from `list()`.
