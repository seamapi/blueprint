import { createBlueprint, TypesModuleSchema } from '@seamapi/blueprint'
import * as types from '@seamapi/types/connect'
import test from 'ava'

test('createBlueprint', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule)
  t.snapshot(blueprint, 'blueprint')
})
