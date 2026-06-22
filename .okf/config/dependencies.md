---
type: config
title: Dependencies
description: Runtime and dev dependencies — what each is used for and why it was chosen
resource: package.json
tags:
  - dependencies
  - npm
timestamp: '2026-06-22T17:12:42.889Z'
---

## Runtime dependencies

### `gray-matter@^4.0.3`
**Used in:** `src/frontmatter.ts`
**Purpose:** Parses the `---\nyaml\n---\nbody` format of OKF files.
**Why:** Handles fence detection, edge cases, and streaming. More reliable than manual regex splitting.
**Note:** Only used for *parsing* (`matter(raw)`). Serialization uses `js-yaml` directly because `matter.stringify`'s `engines` option requires a full `{ parse, stringify }` object.

### `js-yaml@^5.0.0`
**Used in:** `src/frontmatter.ts` (named import: `{ dump as yamlDump }`)
**Purpose:** Serializes frontmatter YAML with `lineWidth: -1` to prevent line wrapping of long values.
**Why:** js-yaml v5 uses named exports only (no default export). The `dump` function is imported directly.
**Note:** Already a transitive dep of `gray-matter`, but listed explicitly to avoid relying on transitive deps.

## Dev dependencies

| Package | Purpose |
|---------|---------|
| `typescript@^5.5` | Language + type declarations |
| `tsup@^8.0` | Build tool (wraps esbuild + tsc) |
| `vitest@^2.0` | Test runner + coverage |
| `@vitest/coverage-v8` | V8-native coverage provider |
| `@types/node@^22` | Node.js built-in type definitions |
| `@types/js-yaml@^4` | Type definitions for js-yaml |
