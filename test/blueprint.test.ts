import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

import * as types from './fixtures/types/index.js'

test('createBlueprint', (t) => {
  const blueprint = createBlueprint(types)
  t.snapshot(blueprint, 'blueprint')
})
