export class OKFError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OKFError'
  }
}

export class OKFValidationError extends OKFError {
  constructor(
    public readonly filePath: string,
    message: string,
  ) {
    super(message)
    this.name = 'OKFValidationError'
  }
}

export class OKFMissingTypeError extends OKFValidationError {
  constructor(filePath: string) {
    super(filePath, `OKF concept at "${filePath}" is missing required "type" field in frontmatter`)
    this.name = 'OKFMissingTypeError'
  }
}
