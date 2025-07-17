import { createBlueprint, TypesModuleSchema } from '@seamapi/blueprint'
import test from 'ava'

import * as types from './fixtures/types/index.js'

test('createBlueprint', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule)
  t.snapshot(blueprint, 'blueprint')
})

test('createBlueprint: with formatCode', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule, {
    formatCode: async (content, syntax) => [`// ${syntax}`, content].join('\n'),
  })
  t.snapshot(blueprint, 'blueprint')
})
