import test from 'ava'

import { createBlueprint, TypesModuleSchema } from '@seamapi/blueprint'

import * as types from './fixtures/types/index.js'

test('createBlueprint', (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = createBlueprint(typesModule)
  t.snapshot(blueprint, 'blueprint')
})
