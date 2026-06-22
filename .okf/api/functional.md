---
type: reference
title: Functional API
description: Stateless one-shot functions for agents that do not maintain a bundle instance
resource: src/concept.ts
tags:
  - api
  - functional
  - one-shot
timestamp: '2026-06-22T17:12:42.889Z'
---

## Exported functions

```ts
import { upsertConcept, readConcept } from 'js-okf'
```

### `upsertConcept(bundleRoot, input)` → `Promise<UpsertResult>`

Same semantics as `OKFBundle.upsert()` but path-explicit.
Useful for AI agent tool calls where a bundle instance isn't maintained.

```ts
const result = await upsertConcept('/project/.okf', {
  id: 'api/auth',
  matter: { type: 'api', title: 'Auth', tags: ['security'] },
  body: '## POST /login\nReturns JWT.',
})
```

### `readConcept(filePath, id)` → `Promise<OKFConcept | null>`

Reads by **absolute file path** (not concept id). Returns `null` if missing.

```ts
const concept = await readConcept('/project/.okf/api/auth.md', 'api/auth')
```

## When to use functional vs class API

| Situation | Use |
|-----------|-----|
| Single operation, no session state | `upsertConcept` / `readConcept` |
| Multiple operations across same bundle | `OKFBundle` instance |
| Agent tool call (one call = one tool use) | Functional API |
| Agent session with many reads/writes | `OKFBundle` instance |
