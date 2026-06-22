---
type: architecture
title: Library Architecture
description: High-level overview of js-okf — what it does, why it exists, and how its modules fit together
tags:
  - architecture
  - overview
timestamp: '2026-06-22T17:12:42.888Z'
---

## Purpose

js-okf is a TypeScript-first library for creating and updating **Open Knowledge Format (OKF)** bundles — directories of markdown files with YAML frontmatter designed as an "LLM-wiki" memory layer for AI coding agents.

## Problem it solves

AI coding agents lose context between sessions. OKF provides a git-friendly, human-readable format for persisting that context. js-okf provides the tooling to create and maintain these files programmatically.

## Module Map

| Module | Responsibility |
|--------|---------------|
| `bundle.ts` | `OKFBundle` class — the main stateful API |
| `concept.ts` | Core read/write/upsert logic (async, filesystem) |
| `frontmatter.ts` | YAML frontmatter parse, merge, and serialize |
| `special.ts` | `index.md` and `log.md` generation |
| `utils.ts` | ID normalization, path helpers, timestamps |
| `errors.ts` | Typed error hierarchy |
| `types.ts` | All TypeScript interfaces |
| `index.ts` | Public re-exports only |

## Data flow

```
User code / Agent
  → OKFBundle.upsert(input)
    → concept.upsertConcept(bundleRoot, input)
      → utils.normalizeId(id)
      → concept.readConcept(filePath, id)       ← returns null if missing
      → frontmatter.mergeMatter(existing, new)  ← on update
      → utils.ensureDir(dirname)                ← on create
      → concept.writeConcept(filePath, matter, body)
        → frontmatter.serializeConcept(matter, body)
        → fs.writeFile(filePath, content)
```

## Published package

- npm: `npm install js-okf`
- GitHub: https://github.com/prabhay759/js-okf
- Node ≥ 18 required
- Dual ESM (`.mjs`) + CJS (`.js`) output
