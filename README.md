# js-okf

> TypeScript/JavaScript library for creating and updating **Open Knowledge Format (OKF)** bundles — the markdown-based knowledge layer for AI coding agents.

[![npm version](https://img.shields.io/npm/v/js-okf.svg)](https://www.npmjs.com/package/js-okf)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

---

## What is OKF?

**Open Knowledge Format (OKF)** is a vendor-neutral, open specification published by Google Cloud (v0.1, June 2026) that formalizes the "LLM-wiki" pattern into a portable, interoperable format. It represents knowledge as a **directory of markdown files**, each with a YAML frontmatter header.

Key properties of OKF:

- **No runtime, no SDK required at read time** — it's just files, just markdown, just YAML
- **File path = concept identity**: `tables/users.md` → concept id `tables/users`
- **Version-controllable in git** with normal PR/diff/blame workflows
- **Renders on GitHub** out of the box
- **Consumed by AI agents, authored by humans and agents alike**

The only required field in every OKF file is `type`. Everything else (`title`, `description`, `tags`, `timestamp`, `resource`, and any custom keys) is optional and extensible.

Official spec: [GoogleCloudPlatform/knowledge-catalog — okf/SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

---

## What is js-okf?

`js-okf` is a TypeScript-first library that gives your JavaScript/TypeScript code (and AI coding agents) a clean API to:

- **Create** an OKF bundle directory and concept files when they don't exist
- **Update** (upsert) existing concept files, intelligently merging frontmatter
- **Read** and list concepts in a bundle
- **Maintain** the optional `index.md` and `log.md` special files

It is designed to be called by AI coding agents (Claude Code, Cursor, Copilot, etc.) as tool calls to persist and retrieve knowledge that survives across agent sessions.

---

## Installation

```bash
npm install js-okf
```

**Requirements:** Node.js ≥ 18

---

## Quick Start

```ts
import { OKFBundle } from 'js-okf'

// Create or open a bundle (a directory of OKF files)
const bundle = new OKFBundle('./knowledge', { createIfMissing: true })

// Create a new concept — parent directories are made automatically
const result = await bundle.upsert({
  id: 'api/authentication',
  matter: {
    type: 'api',
    title: 'Authentication API',
    description: 'Handles JWT-based login and token refresh',
    tags: ['auth', 'security'],
  },
  body: `## POST /auth/login\nAccepts email + password, returns a signed JWT.\n\n## POST /auth/refresh\nAccepts a refresh token, returns a new access token.`,
})

console.log(result.created)   // true — new file was created
console.log(result.filePath)  // /your/project/knowledge/api/authentication.md

// Update the same concept — frontmatter is merged, tags are union-merged
await bundle.upsert({
  id: 'api/authentication',
  matter: {
    type: 'api',
    tags: ['oauth'],   // existing ['auth', 'security'] are preserved
  },
})

// Read a concept back
const concept = await bundle.read('api/authentication')
console.log(concept?.matter.tags) // ['auth', 'security', 'oauth']

// Regenerate index.md with links to all concepts
await bundle.updateIndex()

// Append an entry to log.md
await bundle.appendLog({
  message: 'Added OAuth tag to authentication concept',
  conceptId: 'api/authentication',
  action: 'updated',
})
```

The resulting file `knowledge/api/authentication.md` looks like:

```markdown
---
type: api
title: Authentication API
description: Handles JWT-based login and token refresh
tags:
  - auth
  - security
  - oauth
timestamp: 2026-06-22T09:00:00.000Z
---

## POST /auth/login
Accepts email + password, returns a signed JWT.

## POST /auth/refresh
Accepts a refresh token, returns a new access token.
```

---

## Core Concepts

| Term | Meaning |
|------|---------|
| **Bundle** | A directory on disk containing OKF `.md` files |
| **Concept** | A single `.md` file with YAML frontmatter + markdown body |
| **Concept ID** | The file path relative to the bundle root, without `.md` (e.g. `api/auth`) |
| **Frontmatter** | YAML block at the top of each file (`---` delimited). `type` is the only required field |
| **`index.md`** | Optional auto-generated file listing all concepts with links |
| **`log.md`** | Optional append-only chronological record of changes to the bundle |

---

## API Reference

### `OKFBundle` class

The main interface for working with a bundle directory.

```ts
const bundle = new OKFBundle(bundleRoot: string, options?: BundleOptions)
```

**`BundleOptions`**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `createIfMissing` | `boolean` | `false` | Create the bundle root directory if it does not exist |

---

#### `bundle.upsert(input)`

Create a concept if it doesn't exist, or update it if it does.

```ts
await bundle.upsert(input: UpsertConceptInput): Promise<UpsertResult>
```

**`UpsertConceptInput`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Concept ID (e.g. `'tables/users'` or `'tables/users.md'`) |
| `matter` | `OKFMatter` | Yes | Frontmatter — must include `type` |
| `body` | `string` | No | Markdown body. Defaults to `''` on create |
| `bodyStrategy` | `'replace' \| 'preserve'` | No | On update: `'replace'` (default) overwrites body; `'preserve'` keeps existing |

**`UpsertResult`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Normalized concept ID |
| `filePath` | `string` | Absolute path of the written file |
| `created` | `boolean` | `true` if newly created, `false` if updated |
| `concept` | `OKFConcept` | The final concept as stored on disk |

**Upsert semantics:**
- On **create**: parent directories are created automatically; `timestamp` is set to now
- On **update**: `matter` fields are shallow-merged; `tags` arrays are **union-merged** (no existing tags are dropped); `timestamp` is always refreshed to now

---

#### `bundle.upsertMany(inputs)`

Upsert multiple concepts in parallel.

```ts
await bundle.upsertMany(inputs: UpsertConceptInput[]): Promise<UpsertResult[]>
```

---

#### `bundle.read(id)`

Read and parse an existing concept. Returns `null` if the concept does not exist.

```ts
await bundle.read(id: string): Promise<OKFConcept | null>
```

---

#### `bundle.list(options?)`

List all concept IDs in the bundle.

```ts
await bundle.list(options?: ListOptions): Promise<string[]>
```

**`ListOptions`**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `excludeSpecial` | `boolean` | `true` | Exclude `index` and `log` from results |

Returns sorted concept IDs (e.g. `['api/auth', 'tables/users']`).

---

#### `bundle.updateIndex()`

Regenerate `index.md` from all current concepts. Groups entries by top-level directory and generates markdown links using each concept's `title` (or ID if no title is set).

```ts
await bundle.updateIndex(): Promise<void>
```

---

#### `bundle.appendLog(entry)`

Append a timestamped entry to `log.md`. Creates `log.md` with proper frontmatter on first call; subsequent calls append without modifying existing content.

```ts
await bundle.appendLog(entry: LogEntry): Promise<void>
```

**`LogEntry`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | Yes | Human-readable description of the change |
| `conceptId` | `string` | No | The concept this entry relates to |
| `action` | `'created' \| 'updated' \| 'deleted'` | No | Type of operation |
| `timestamp` | `string` | No | ISO 8601 timestamp — defaults to now |

---

### Functional API

For one-shot operations (e.g. a single agent tool call) without maintaining a bundle instance:

```ts
import { upsertConcept, readConcept } from 'js-okf'

// Same semantics as bundle.upsert()
const result = await upsertConcept('/path/to/bundle', {
  id: 'my-concept',
  matter: { type: 'doc' },
})

// Reads by absolute file path + id
const concept = await readConcept('/path/to/bundle/my-concept.md', 'my-concept')
```

---

### Types

```ts
interface OKFMatter {
  type: string           // required — describes the kind of concept
  title?: string         // display name
  description?: string   // short summary
  resource?: string      // URL or external reference
  tags?: string[]        // categorization tags
  timestamp?: string     // ISO 8601 — auto-managed by js-okf
  [key: string]: unknown // custom keys are tolerated per the OKF spec
}

interface OKFConcept {
  id: string             // concept ID (relative path without .md)
  matter: OKFMatter      // parsed frontmatter
  body: string           // markdown body below the frontmatter fence
}
```

---

### Errors

| Class | When thrown |
|-------|-------------|
| `OKFError` | Base class for all js-okf errors |
| `OKFValidationError` | A concept file fails validation; includes `filePath` property |
| `OKFMissingTypeError` | A concept file is missing the required `type` frontmatter field |

```ts
import { OKFMissingTypeError } from 'js-okf'

try {
  await bundle.read('incomplete-concept')
} catch (err) {
  if (err instanceof OKFMissingTypeError) {
    console.error('Missing type in:', err.filePath)
  }
}
```

---

## Using with AI Coding Agents

`js-okf` is built for use inside AI coding agent workflows. A typical pattern:

```ts
import { OKFBundle } from 'js-okf'

// Agent opens (or creates) the knowledge bundle at session start
const knowledge = new OKFBundle('.okf', { createIfMissing: true })

// Agent records what it learned about the codebase
await knowledge.upsert({
  id: 'architecture/database',
  matter: {
    type: 'architecture',
    title: 'Database Layer',
    description: 'PostgreSQL via Prisma ORM; all queries in src/db/',
    tags: ['database', 'prisma', 'postgresql'],
  },
  body: `## Schema\nSee prisma/schema.prisma.\n\n## Query patterns\nAll DB calls go through repository classes in src/db/repositories/.`,
})

// Agent reads existing knowledge before acting
const existing = await knowledge.read('architecture/database')
if (existing) {
  console.log('Known context:', existing.matter.description)
}

// Agent logs what it did
await knowledge.appendLog({
  message: 'Discovered Prisma ORM is the database layer',
  conceptId: 'architecture/database',
  action: 'created',
})

// Regenerate the index for navigation at session end
await knowledge.updateIndex()
```

The `.okf/` directory is committed to git, so every agent session — and every human — has access to the accumulated knowledge.

---

## OKF File Format

Every concept file produced by js-okf follows this structure:

```markdown
---
type: <string>            # required
title: My Concept         # optional
description: One-liner.   # optional
resource: https://...     # optional
tags:                     # optional
  - tag-a
  - tag-b
timestamp: 2026-06-22T09:00:00.000Z  # managed automatically by js-okf
customKey: any value      # custom keys are allowed and preserved
---

Markdown body content goes here.

## Subheadings, code blocks, links — all standard markdown.
```

---

## License

MIT © Prabhay Gupta
