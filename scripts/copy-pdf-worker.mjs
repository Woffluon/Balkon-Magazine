import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'

const source = 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
const target = 'public/pdf.worker.min.mjs'

if (!existsSync(source)) {
  throw new Error(`PDF.js worker not found: ${source}`)
}

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)

const hash = createHash('sha256')
  .update(readFileSync(target))
  .digest('hex')

console.log(`Copied PDF.js worker to ${target} (sha256:${hash})`)
