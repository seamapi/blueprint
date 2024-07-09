import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

import * as types from './fixtures/types/index.js'

test('createBlueprint', (t) => {
  // @ts-expect-error Remove once the fixture is propely typed
  const blueprint = createBlueprint(types)
  t.snapshot(blueprint, 'blueprint')
})
