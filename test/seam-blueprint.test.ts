import { openapi } from '@seamapi/types/connect'
import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

test('createBlueprint', (t) => {
  const blueprint = createBlueprint({ openapi })
  t.snapshot(blueprint, 'blueprint')
})
