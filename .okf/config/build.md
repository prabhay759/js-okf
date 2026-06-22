---
type: config
title: Build Config
description: tsup build setup producing dual ESM + CJS output; tsconfig strict mode settings
resource: tsup.config.ts
tags:
  - build
  - tsup
  - typescript
  - esm
  - cjs
timestamp: '2026-06-22T17:12:42.889Z'
---

## tsup.config.ts

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,        // generates .d.ts and .d.mts
  sourcemap: true,
  clean: true,
  splitting: false,  // single file output (library is small)
  treeshake: true,
})
```

## Output files

| File | Format | Purpose |
|------|--------|---------|
| `dist/index.mjs` | ESM | `import { OKFBundle } from 'js-okf'` |
| `dist/index.js` | CJS | `const { OKFBundle } = require('js-okf')` |
| `dist/index.d.mts` | TS decls | Types for ESM consumers |
| `dist/index.d.ts` | TS decls | Types for CJS consumers |

## tsconfig.json key settings

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "strict": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true
}
```

`exactOptionalPropertyTypes`: prevents `{ key: undefined }` being passed where key should be absent.
`noUncheckedIndexedAccess`: makes `matter[customKey]` return `unknown | undefined` safely.

## package.json exports

```json
{
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
    }
  }
}
```
