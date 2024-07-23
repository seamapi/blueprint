import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

import { openApiSchema } from 'lib/openapi-validator.js'

import * as types from './fixtures/types/index.js'

test('Validate OpenAPI schema', (t) => {
  try {
    const validatedTypes = openApiSchema.parse(types.openapi)
    t.pass('OpenAPI schema is valid')

    // @ts-expect-error Remove once the fixture is properly typed
    const blueprint = createBlueprint({ openapi: validatedTypes })

    t.truthy(blueprint.title, 'Blueprint has a title')
    t.true(Array.isArray(blueprint.routes), 'Blueprint has routes')
    t.truthy(blueprint.resources, 'Blueprint has resources')
  } catch (error) {
    t.fail(
      `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
})
