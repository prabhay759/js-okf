import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
  },
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    dts: false,
    sourcemap: false,
    clean: false,
    banner: { js: '#!/usr/bin/env node' },
  },
])
