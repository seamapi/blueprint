import { openapi } from '@seamapi/types/connect'
import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

import type { OpenAPI } from 'lib/openapi.js'

test('createBlueprint', (t) => {
  const blueprint = createBlueprint({ openapi: openapi as unknown as OpenAPI })
  t.snapshot(blueprint, 'blueprint')
})
