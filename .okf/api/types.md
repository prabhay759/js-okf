---
type: reference
title: TypeScript Types
description: All exported TypeScript interfaces — the complete public type surface of js-okf
resource: src/types.ts
tags:
  - typescript
  - types
  - interfaces
timestamp: '2026-06-22T17:12:42.889Z'
---

## Location

`src/types.ts` — imported by all other modules, re-exported from `src/index.ts`

## Interfaces

### `OKFMatter`
```ts
interface OKFMatter {
  type: string           // required per OKF spec
  title?: string
  description?: string
  resource?: string      // URL or external ref
  tags?: string[]
  timestamp?: string     // ISO 8601, auto-managed by js-okf
  [key: string]: unknown // extensible — custom keys tolerated
}
```

### `OKFConcept`
```ts
interface OKFConcept {
  id: string        // normalized relative path without .md
  matter: OKFMatter
  body: string      // markdown body, trimmed
}
```

### `UpsertConceptInput`
```ts
interface UpsertConceptInput {
  id: string
  matter: OKFMatter
  body?: string
  bodyStrategy?: 'replace' | 'preserve'  // default: 'replace'
}
```

### `UpsertResult`
```ts
interface UpsertResult {
  id: string
  filePath: string   // absolute path of written file
  created: boolean   // true = new, false = updated
  concept: OKFConcept
}
```

### `BundleOptions`
```ts
interface BundleOptions {
  createIfMissing?: boolean  // default: false
}
```

### `ListOptions`
```ts
interface ListOptions {
  excludeSpecial?: boolean  // default: true
}
```

### `LogEntry`
```ts
interface LogEntry {
  message: string
  conceptId?: string
  action?: 'created' | 'updated' | 'deleted'
  timestamp?: string  // defaults to nowISO()
}
```

## TypeScript strictness

tsconfig enables `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`,
making the `[key: string]: unknown` index signature safer to work with.
