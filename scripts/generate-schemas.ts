import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {schemaDocuments} from './schema-documents.js'

const outputDirectory = fileURLToPath(new URL('../schemas/', import.meta.url))
await mkdir(outputDirectory, {recursive: true})
const documents = schemaDocuments()
for (const document of documents) {
  await writeFile(path.join(outputDirectory, document.filename), document.source, 'utf8')
}

process.stdout.write(`Generated ${documents.length} JSON Schemas.\n`)
