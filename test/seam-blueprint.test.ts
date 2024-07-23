import * as types from '@seamapi/types/connect'
import test from 'ava'

import { createBlueprint, TypesModuleSchema } from '@seamapi/blueprint'

test('createBlueprint', (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = createBlueprint(typesModule)
  t.snapshot(blueprint, 'blueprint')
})
