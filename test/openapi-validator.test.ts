import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

import { openApiSchema } from 'lib/openapi-validator.js'

import * as types from './fixtures/types/index.js'

test('Validate OpenAPI schema', (t) => {
  try {
    const validatedTypes = openApiSchema.parse(types.openapi)
    t.pass('OpenAPI schema is valid')

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

test('Blueprint routes', (t) => {
  const validatedTypes = openApiSchema.parse(types.openapi)
  const blueprint = createBlueprint({ openapi: validatedTypes })

  t.true(Array.isArray(blueprint.routes), 'Routes is an array')
  if (blueprint.routes.length > 0) {
    const firstRoute = blueprint.routes[0]
    t.truthy(firstRoute?.path, 'Route has a path')
    t.true(Array.isArray(firstRoute?.endpoints), 'Route has endpoints')
  }
})

test('Blueprint resources', (t) => {
  const validatedTypes = openApiSchema.parse(types.openapi)
  const blueprint = createBlueprint({ openapi: validatedTypes })

  t.truthy(blueprint.resources, 'Resources exist')
  const resourceNames = Object.keys(blueprint.resources)
  if (resourceNames.length > 0) {
    const firstResource = blueprint.resources.resourceNames[0]
    t.truthy(firstResource.resourceType, 'Resource has a type')
    t.true(Array.isArray(firstResource.properties), 'Resource has properties')
  }
})
