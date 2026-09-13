import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {schemaDocuments} from './schema-documents.js'

const schemasRoot = fileURLToPath(new URL('../schemas/', import.meta.url))
const stale: string[] = []
for (const document of schemaDocuments()) {
  let current = ''
  try {
    current = await readFile(path.join(schemasRoot, document.filename), 'utf8')
  } catch {
    stale.push(document.filename)
    continue
  }
  if (current !== document.source) stale.push(document.filename)
}

if (stale.length > 0) {
  process.stderr.write(`Generated schemas are stale: ${stale.join(', ')}. Run pnpm run generate:schemas.\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Verified ${schemaDocuments().length} generated JSON Schemas.\n`)
}
