export interface OKFMatter {
  type: string
  title?: string
  description?: string
  resource?: string
  tags?: string[]
  timestamp?: string
  [key: string]: unknown
}

export interface OKFConcept {
  id: string
  matter: OKFMatter
  body: string
  /** Absolute path to the underlying .md file */
  path?: string
}

export interface UpsertConceptInput {
  id: string
  matter: OKFMatter
  body?: string
  bodyStrategy?: 'replace' | 'preserve'
}

export interface UpsertResult {
  id: string
  filePath: string
  created: boolean
  concept: OKFConcept
}

export interface BundleOptions {
  createIfMissing?: boolean
}

export interface ListOptions {
  excludeSpecial?: boolean
}

export interface LogEntry {
  message: string
  conceptId?: string
  action?: 'created' | 'updated' | 'deleted'
  timestamp?: string
}

export interface ServeOptions {
  port?: number
  host?: string
  open?: boolean
}
