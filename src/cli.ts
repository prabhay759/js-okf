import path from 'node:path'
import { createServer } from './server.js'
import type { ServeOptions } from './types.js'

function parseArgs(argv: string[]): { bundleRoot: string; options: ServeOptions } {
  const args = argv.slice(2)
  let bundleRoot = '.'
  const options: ServeOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--port' || arg === '-p') {
      const val = args[++i]
      if (val !== undefined) options.port = parseInt(val, 10)
    } else if (arg?.startsWith('--port=')) {
      options.port = parseInt(arg.slice(7), 10)
    } else if (arg === '--host') {
      const val = args[++i]
      if (val !== undefined) options.host = val
    } else if (arg === '--open' || arg === '-o') {
      options.open = true
    } else if (arg !== undefined && !arg.startsWith('--')) {
      bundleRoot = arg
    }
  }

  return { bundleRoot: path.resolve(bundleRoot), options }
}

const { bundleRoot, options } = parseArgs(process.argv)
const srv = createServer(bundleRoot, options)

srv.start().catch((err: unknown) => {
  console.error('Failed to start OKF Viewer:', err)
  process.exit(1)
})

process.on('SIGINT', () => {
  srv.stop().then(() => process.exit(0)).catch(() => process.exit(1))
})
process.on('SIGTERM', () => {
  srv.stop().then(() => process.exit(0)).catch(() => process.exit(1))
})
