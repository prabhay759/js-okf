---
type: testing
title: Test Suite
description: 69 tests across 5 vitest test files — what each file covers and key scenarios tested
resource: tests/
tags:
  - testing
  - vitest
  - coverage
timestamp: '2026-06-22T17:12:42.889Z'
---

## Framework

**vitest** v2 with Node environment (no jsdom — filesystem library).
**@vitest/coverage-v8** for V8-native coverage reporting.

## Test files

### `tests/utils.test.ts` (11 tests)
- `normalizeId`: leading slashes, `.md` suffix, backslashes, combinations
- `idToFilePath`: path construction with normalization
- `nowISO`: ISO 8601 format validation
- `ensureDir`: nested directory creation, idempotency

### `tests/frontmatter.test.ts` (16 tests)
- `parseConcept`: valid frontmatter, empty body, custom keys, missing type, empty type
- `mergeMatter`: scalar override, tag union-merge, custom key preservation, timestamp stripping
- `serializeConcept`: `---` fence, body, empty body, round-trip identity

### `tests/concept.test.ts` (13 tests)
- `readConcept`: null for missing, parse existing
- `upsertConcept`: create with nested dirs, timestamp on create, tags merge, timestamp refresh on update, body strategies, id normalization (`.md` and leading `/`)

### `tests/bundle.test.ts` (16 tests)
- Constructor: `createIfMissing`, auto-creates dirs on upsert
- `upsert` / `upsertMany`: create + update
- `read`: null + parse
- `list`: excludeSpecial filter, deep nesting, empty bundle
- `updateIndex`: frontmatter, links
- `appendLog`: create, frontmatter, accumulation

### `tests/special.test.ts` (13 tests)
- `updateIndex`: type, title/id links, directory grouping, empty bundle, timestamp refresh
- `appendLog`: creation, frontmatter, action/conceptId formatting, accumulation order, frontmatter preservation

## Test helpers (`tests/helpers.ts`)

```ts
tmpBundleDir()         // mkdtemp under os.tmpdir()
cleanupDir(dir)        // rmSync recursive
readRaw(filePath)      // fs.readFileSync utf-8
writeRaw(filePath, s)  // mkdirSync + writeFileSync (for fixtures)
```

Each test's `beforeEach` creates a fresh temp dir; `afterEach` cleans it up.
This ensures tests are fully isolated with no shared filesystem state.
