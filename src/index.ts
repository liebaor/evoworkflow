#!/usr/bin/env node

import {execute} from '@oclif/core'

await execute({development: import.meta.url.endsWith('.ts'), dir: import.meta.url})
