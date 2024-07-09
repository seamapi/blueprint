import { openapi } from '@seamapi/types/connect'
import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

import type { Openapi } from 'lib/openapi.js'

test('createBlueprint', (t) => {
  const blueprint = createBlueprint({ openapi: openapi as unknown as Openapi })
  t.snapshot(blueprint, 'blueprint')
})
