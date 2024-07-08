import test from 'ava'

import { createBlueprint, type TypesModule } from '@seamapi/blueprint'

import type { OpenAPI } from 'lib/openapi.js'

import * as types from './fixtures/types/index.js'

const typesModule: TypesModule = {
  openapi: types.openapi as unknown as OpenAPI,
}

test('createBlueprint', (t) => {
  const blueprint = createBlueprint(typesModule)
  t.snapshot(blueprint, 'blueprint')
})
