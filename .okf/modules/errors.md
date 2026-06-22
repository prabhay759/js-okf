---
type: module
title: Error Classes
description: Typed error hierarchy for OKF validation failures
resource: src/errors.ts
tags:
  - errors
  - validation
timestamp: '2026-06-22T17:12:42.889Z'
---

## Location

`src/errors.ts`

## Hierarchy

```
Error
  └── OKFError
        └── OKFValidationError   (adds: filePath: string)
              └── OKFMissingTypeError
```

## Classes

### `OKFError`
Base class. Sets `this.name = 'OKFError'`.

### `OKFValidationError`
```ts
class OKFValidationError extends OKFError {
  constructor(public readonly filePath: string, message: string)
}
```
Thrown when a concept file fails validation. The `filePath` property
gives agents the exact file that caused the error.

### `OKFMissingTypeError`
```ts
class OKFMissingTypeError extends OKFValidationError {
  constructor(filePath: string) {
    super(filePath, `OKF concept at "${filePath}" is missing required "type" field`)
  }
}
```
Thrown by `parseConcept` when `type` is absent or an empty string.

## Usage pattern

```ts
import { OKFMissingTypeError } from 'js-okf'

try {
  await bundle.read('bad-concept')
} catch (err) {
  if (err instanceof OKFMissingTypeError) {
    console.error('Fix this file:', err.filePath)
  }
}
```
