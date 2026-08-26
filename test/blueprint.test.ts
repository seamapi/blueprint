import {
  type Blueprint,
  createBlueprint,
  type Endpoint,
  TypesModuleSchema,
} from '@seamapi/blueprint'
import test, { type ExecutionContext } from 'ava'

import * as types from './fixtures/types/index.js'

test('createBlueprint', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule)
  t.snapshot(blueprint, 'blueprint')
})

test('createBlueprint: with omitUndocumented', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule, {
    omitUndocumented: true,
  })

  t.false(
    blueprint.routes.some((route) => route.isUndocumented),
    'Undocumented routes should be omitted',
  )
  t.false(
    blueprint.routes.some((route) =>
      route.endpoints.some((endpoint) => endpoint.isUndocumented),
    ),
    'Undocumented endpoints should be omitted',
  )
  t.false(
    blueprint.namespaces.some((namespace) => namespace.isUndocumented),
    'Undocumented namespaces should be omitted',
  )
  t.false(
    blueprint.resources.some((resource) => resource.isUndocumented),
    'Undocumented resources should be omitted',
  )
  t.false(
    blueprint.events.some((event) => event.isUndocumented),
    'Undocumented events should be omitted',
  )
  t.false(
    blueprint.actionAttempts.some(
      (actionAttempt) => actionAttempt.isUndocumented,
    ),
    'Undocumented action attempts should be omitted',
  )

  const fooResource = blueprint.resources.find(
    (resource) => resource.resourceType === 'foo',
  )
  t.false(
    fooResource?.properties.some((property) => property.isUndocumented),
    'Undocumented resource properties should be omitted',
  )

  t.snapshot(blueprint, 'blueprint')
})

test('createBlueprint: with formatCode', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule, {
    formatCode: async (content, syntax) => [`// ${syntax}`, content].join('\n'),
  })
  t.snapshot(blueprint, 'blueprint')
})

test('createBlueprint: throws when a /seam entry is documented', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  openapi.paths['/seam/widgets/get'] = {
    post: {
      operationId: 'seamWidgetsGetPost',
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  ok: { type: 'boolean' },
                },
                required: ['ok'],
                type: 'object',
              },
            },
          },
          description: 'OK',
        },
      },
      security: [],
      summary: '/seam/widgets/get',
      tags: ['/seam/widgets'],
      'x-response-key': null,
      'x-title': 'Get seam widgets',
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /All \/seam entries must be marked undocumented\. Found: .*\/seam\/widgets\/get/,
  })
})

test('createBlueprint: throws when a documented endpoint response uses an inline resource schema', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (responseProperties?.foo == null) {
    t.fail('Expected /foos/get response schema to exist')
    return
  }

  responseProperties.foo = {
    type: 'object',
    properties: {
      foo_id: { type: 'string', format: 'uuid' },
    },
    required: ['foo_id'],
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /Documented endpoint responses must reference a resource type using \$ref\. Found:\n\/foos\/get response key 'foo' uses an inline schema instead of \$ref/,
  })
})

test('createBlueprint: allows undocumented endpoint responses to use inline resource schemas', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (operation == null || responseProperties?.foo == null) {
    t.fail('Expected /foos/get operation and response schema to exist')
    return
  }

  operation['x-undocumented'] = 'This endpoint is not public.'
  responseProperties.foo = {
    type: 'object',
    properties: {
      foo_id: { type: 'string', format: 'uuid' },
    },
    required: ['foo_id'],
  }

  const blueprint = await createBlueprint({ ...typesModule, openapi })
  const endpoint = blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/foos/get')

  t.true(endpoint?.isUndocumented)
  t.deepEqual(endpoint?.response, {
    actionAttemptType: null,
    batchResourceTypes: null,
    description: 'Get a foo by ID.',
    resourceType: 'unknown',
    responseKey: 'foo',
    responseType: 'resource',
  })
})

test('createBlueprint: resolves documented batch response keys without requiring an outer resource ref', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (operation == null || responseProperties == null) {
    t.fail('Expected /foos/get operation and response schema to exist')
    return
  }

  operation['x-response-key'] = 'batch'
  operation['x-batch-keys'] = ['foos']
  responseProperties.batch = {
    type: 'object',
    properties: {
      foos: {
        type: 'array',
        items: { $ref: '#/components/schemas/foo' },
      },
    },
  }

  const blueprint = await createBlueprint({
    ...typesModule,
    codeSampleDefinitions: [],
    openapi,
  })
  const endpoint = blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/foos/get')

  t.deepEqual(
    endpoint?.response.responseType === 'resource'
      ? endpoint.response.batchResourceTypes
      : null,
    [{ batchKey: 'foos', resourceType: 'foo' }],
  )
})

test('createBlueprint: throws when a documented batch key does not resolve using items.$ref', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (operation == null || responseProperties == null) {
    t.fail('Expected /foos/get operation and response schema to exist')
    return
  }

  operation['x-response-key'] = 'batch'
  operation['x-batch-keys'] = ['foos']
  responseProperties.batch = {
    type: 'object',
    properties: {
      foos: {
        type: 'array',
        items: { type: 'object' },
      },
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /\/foos\/get batch key 'foos' does not resolve using items\.\$ref/,
  })
})

test('createBlueprint: throws when a documented endpoint references an unknown resource type', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (responseProperties?.foo == null) {
    t.fail('Expected /foos/get response schema to exist')
    return
  }

  responseProperties.foo = {
    $ref: '#/components/schemas/missing_resource',
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /\/foos\/get response key 'foo' references unknown resource type 'missing_resource'/,
  })
})

test('createBlueprint: throws when a documented endpoint references an undocumented resource', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  // Add an undocumented resource
  openapi.components.schemas['secret_widget'] = {
    type: 'object',
    properties: {
      secret_widget_id: { type: 'string', format: 'uuid' },
    },
    required: ['secret_widget_id'],
    'x-undocumented': 'This resource is not yet public.',
    'x-route-path': '/foos',
  }

  // Add a documented endpoint that returns the undocumented resource
  openapi.paths['/widgets/get'] = {
    post: {
      operationId: 'widgetsGetPost',
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  ok: { type: 'boolean' },
                  secret_widget: {
                    $ref: '#/components/schemas/secret_widget',
                  },
                },
                required: ['ok', 'secret_widget'],
                type: 'object',
              },
            },
          },
          description: 'OK',
        },
      },
      security: [],
      summary: '/widgets/get',
      tags: ['/widgets'],
      'x-response-key': 'secret_widget',
      'x-title': 'Get a widget',
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /Documented endpoints must not reference undocumented resources\. Found:\n.*\/widgets\/get.*secret_widget/,
  })
})

test('createBlueprint: throws when a documented resource references an undocumented route', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema == null) {
    t.fail('Expected foo schema to exist')
    return
  }

  fooSchema['x-route-path'] = '/deprecated/undocumented'

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /Documented resources must not reference undocumented routes\. Found:\n.*'foo' references undocumented route '\/deprecated\/undocumented'/,
  })
})

test('createBlueprint: throws when an error code is missing resource_type', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['errors'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'error_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            error_code: {
              type: 'string',
              enum: ['foo_error'],
            },
            message: {
              type: 'string',
            },
          },
          required: ['error_code', 'message'],
        },
      ],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /Missing resource_type for error code foo_error/,
  })
})

test('createBlueprint: throws on duplicate enum values in a property', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['status'] = {
    type: 'string',
    enum: ['active', 'inactive', 'active'],
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /Duplicate enum values for property 'foo\.status': 'active'/,
  })
})

test('createBlueprint: throws on duplicate enum values in a request parameter', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const operation = openapi.paths['/foos/create']?.post
  if (operation == null) {
    t.fail('Expected /foos/create to have a post operation')
    return
  }

  operation.requestBody = {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            manufacturer: {
              type: 'string',
              enum: ['kisi', 'august', 'kisi'],
            },
          },
        },
      },
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /Duplicate enum values for parameter 'manufacturer' in \/foos\/create: 'kisi'/,
  })
})

test('createBlueprint: throws when a resource has an error and a warning with the same code', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['errors'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'error_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            error_code: { type: 'string', enum: ['foo_issue'] },
            message: { type: 'string' },
          },
          required: ['error_code', 'message'],
          'x-resource-type': 'foo',
        },
      ],
    },
  }

  fooSchema.properties['warnings'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'warning_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            warning_code: { type: 'string', enum: ['foo_issue'] },
            message: { type: 'string' },
          },
          required: ['warning_code', 'message'],
        },
      ],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /resource 'foo' has an error and a warning with the code 'foo_issue'/,
  })
})

test('createBlueprint: throws when an error code contains error', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['errors'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'error_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            error_code: { type: 'string', enum: ['error_setting_on_device'] },
            message: { type: 'string' },
          },
          required: ['error_code', 'message'],
          'x-resource-type': 'foo',
        },
      ],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /resource 'foo' has an error with the code 'error_setting_on_device'/,
  })
})

test('createBlueprint: throws when a warning code contains warning', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['warnings'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'warning_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            warning_code: { type: 'string', enum: ['warning_from_provider'] },
            message: { type: 'string' },
          },
          required: ['warning_code', 'message'],
        },
      ],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /resource 'foo' has a warning with the code 'warning_from_provider'/,
  })
})

test('createBlueprint: throws on duplicate discriminator values across variants', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  const errorVariant = {
    type: 'object',
    properties: {
      error_code: {
        type: 'string',
        enum: ['foo_error'],
      },
      message: {
        type: 'string',
      },
    },
    required: ['error_code', 'message'],
    'x-resource-type': 'foo',
  }

  fooSchema.properties['errors'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'error_code' },
      oneOf: [errorVariant, structuredClone(errorVariant)],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /Duplicate error_code values for 'foo\.errors': 'foo_error'/,
  })
})

test('createBlueprint: throws when a request parameter does not define a type', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const createOperation = openapi.paths['/foos/create']?.post

  if (createOperation == null) {
    t.fail('Expected the /foos/create post operation in the fixture')
    return
  }

  createOperation.requestBody = {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { untyped_param: { description: 'No type here.' } },
        },
      },
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /The untyped_param property for \/foos\/create cannot be documented since it does not define a type/,
  })
})

test('createBlueprint: throws when a nested property does not define a type', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const successVariant =
    openapi.components?.schemas?.action_attempt?.oneOf?.find(
      (variant: { properties?: { status?: { enum?: string[] } } }) =>
        variant.properties?.status?.enum?.[0] === 'success',
    )

  if (successVariant?.properties?.result?.properties == null) {
    t.fail('Expected the succeeded action attempt result in the fixture')
    return
  }

  successVariant.properties.result.properties.untyped_property = {
    description: 'No type here.',
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /The untyped_property property for action_attempt.result cannot be documented since it does not define a type/,
  })
})

test('createBlueprint: throws when an endpoint exposes more than two methods', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const createOperation = openapi.paths['/foos/create']?.post

  if (createOperation == null) {
    t.fail('Expected the /foos/create post operation in the fixture')
    return
  }

  openapi.paths['/foos/replace'] = {
    post: structuredClone(createOperation),
    patch: structuredClone(createOperation),
    put: structuredClone(createOperation),
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /More than two methods detected for \/foos\/replace/,
  })
})

test('createBlueprint: allows more than two methods on exempt endpoints', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const createOperation = openapi.paths['/foos/create']?.post

  if (createOperation == null) {
    t.fail('Expected the /foos/create post operation in the fixture')
    return
  }

  openapi.paths['/access_codes/update'] = {
    post: structuredClone(createOperation),
    patch: structuredClone(createOperation),
    put: structuredClone(createOperation),
  }

  const blueprint = await createBlueprint({ ...typesModule, openapi })
  const endpoint = blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/access_codes/update')

  // Methods are ordered by name, not by how the spec listed them.
  t.deepEqual(endpoint?.request.methods, ['PATCH', 'POST', 'PUT'])
})

test('createBlueprint: builds an endpoint from a semantic-method spec without a post operation', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const foosGetPathItem = openapi.paths['/foos/get']

  if (foosGetPathItem?.get == null) {
    t.fail('Expected the /foos/get get operation in the fixture')
    return
  }

  foosGetPathItem.get.parameters = [
    {
      name: 'foo_id',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ]
  delete foosGetPathItem.post

  const blueprint = await createBlueprint({ ...typesModule, openapi })
  const endpoint = blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/foos/get')

  t.deepEqual(endpoint?.request.methods, ['GET', 'POST'])
  t.is(endpoint?.request.semanticMethod, 'GET')

  const fooIdParameter = endpoint?.request.parameters.find(
    ({ name }) => name === 'foo_id',
  )
  t.is(fooIdParameter?.isRequired, true)
  t.true(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: a semantic-method spec produces the same endpoint as a post-mirrored spec', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)

  const mirroredOpenapi = structuredClone(typesModule.openapi)
  const mirroredPathItem = mirroredOpenapi.paths['/foos/get']

  if (mirroredPathItem?.get == null || mirroredPathItem.post == null) {
    t.fail('Expected the /foos/get get and post operations in the fixture')
    return
  }

  mirroredPathItem.get.parameters = [
    {
      name: 'foo_id',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ]
  mirroredPathItem.post.requestBody = {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { foo_id: { type: 'string', format: 'uuid' } },
          required: ['foo_id'],
        },
      },
    },
  }

  const semanticOpenapi = structuredClone(mirroredOpenapi)
  const semanticPathItem = semanticOpenapi.paths['/foos/get']

  if (semanticPathItem == null) {
    t.fail('Expected the /foos/get path in the fixture')
    return
  }

  delete semanticPathItem.post

  const findFoosGetEndpoint = (blueprint: Blueprint): Endpoint | undefined =>
    blueprint.routes
      .flatMap((route) => route.endpoints)
      .find(({ path }) => path === '/foos/get')

  const mirroredEndpoint = findFoosGetEndpoint(
    await createBlueprint({ ...typesModule, openapi: mirroredOpenapi }),
  )
  const semanticEndpoint = findFoosGetEndpoint(
    await createBlueprint({ ...typesModule, openapi: semanticOpenapi }),
  )

  t.truthy(mirroredEndpoint)
  t.deepEqual(semanticEndpoint, mirroredEndpoint)
})

const createBlueprintWithFoosGetRequestBody = async (
  t: ExecutionContext,
  schema: Record<string, unknown>,
  hasRequiredParameters?: boolean,
): Promise<Endpoint | undefined> => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post

  if (operation == null) {
    t.fail('Expected the /foos/get post operation in the fixture')
  }

  operation.requestBody = { content: { 'application/json': { schema } } }

  if (hasRequiredParameters != null) {
    operation['x-has-required-parameters'] = hasRequiredParameters
  }

  const blueprint = await createBlueprint({ ...typesModule, openapi })

  return blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/foos/get')
}

test('createBlueprint: hasRequiredParameters is false when every parameter is optional', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(t, {
    type: 'object',
    properties: { foo_id: { type: 'string' }, name: { type: 'string' } },
  })

  t.false(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: hasRequiredParameters is true when a parameter is required', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(t, {
    type: 'object',
    properties: { foo_id: { type: 'string' } },
    required: ['foo_id'],
  })

  t.true(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: hasRequiredParameters is true when every union variant requires a parameter', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(t, {
    oneOf: [
      {
        type: 'object',
        properties: { foo_id: { type: 'string' } },
        required: ['foo_id'],
      },
      {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    ],
  })

  t.deepEqual(
    endpoint?.request.parameters.map(({ name, isRequired }) => ({
      name,
      isRequired,
    })),
    [
      { name: 'foo_id', isRequired: false },
      { name: 'name', isRequired: false },
    ],
  )
  t.true(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: hasRequiredParameters honors the annotation when all parameters are optional', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(
    t,
    {
      type: 'object',
      properties: { foo_id: { type: 'string' }, name: { type: 'string' } },
    },
    true,
  )

  t.true(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: throws when the annotation contradicts a required parameter', async (t) => {
  await t.throwsAsync(
    async () =>
      await createBlueprintWithFoosGetRequestBody(
        t,
        {
          type: 'object',
          properties: { foo_id: { type: 'string' } },
          required: ['foo_id'],
        },
        false,
      ),
    {
      message:
        /\/foos\/get sets 'x-has-required-parameters: false' but requires foo_id/,
    },
  )
})

const createBlueprintWithFooProperties = async (
  t: ExecutionContext,
  properties: Record<string, unknown>,
): Promise<Blueprint> => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const fooSchema = openapi.components.schemas['foo']

  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
  }

  Object.assign(fooSchema.properties, properties)
  return await createBlueprint({ ...typesModule, openapi })
}

test('createBlueprint: preserves boolean enum constraints on resource properties', async (t) => {
  const blueprint = await createBlueprintWithFooProperties(t, {
    true_literal: { type: 'boolean', enum: [true] },
    false_literal: { type: 'boolean', enum: [false] },
    multiple_literals: { type: 'boolean', enum: [true, false] },
    unconstrained_boolean: { type: 'boolean' },
  })

  const properties = blueprint.resources.find(
    ({ resourceType }) => resourceType === 'foo',
  )?.properties
  const trueLiteral = properties?.find(({ name }) => name === 'true_literal')
  const falseLiteral = properties?.find(({ name }) => name === 'false_literal')
  const multipleLiterals = properties?.find(
    ({ name }) => name === 'multiple_literals',
  )
  const unconstrainedBoolean = properties?.find(
    ({ name }) => name === 'unconstrained_boolean',
  )

  if (
    trueLiteral?.format !== 'boolean' ||
    falseLiteral?.format !== 'boolean' ||
    multipleLiterals?.format !== 'boolean' ||
    unconstrainedBoolean?.format !== 'boolean'
  ) {
    t.fail('Expected all test properties to be booleans')
    return
  }

  t.deepEqual(trueLiteral.values, [true])
  t.deepEqual(falseLiteral.values, [false])
  t.is(
    falseLiteral.values?.[0],
    false,
    'Expected the false literal to be retained',
  )
  t.deepEqual(multipleLiterals.values, [true, false])
  t.false('values' in unconstrainedBoolean)
})

test('createBlueprint: preserves boolean constraints on request parameters independently of defaults', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(t, {
    type: 'object',
    properties: {
      include_unmanaged: { type: 'boolean', enum: [false] },
      use_cache: { type: 'boolean', default: false },
    },
  })
  const includeUnmanaged = endpoint?.request.parameters.find(
    ({ name }) => name === 'include_unmanaged',
  )
  const useCache = endpoint?.request.parameters.find(
    ({ name }) => name === 'use_cache',
  )

  if (includeUnmanaged?.format !== 'boolean') {
    t.fail('Expected include_unmanaged to be a boolean parameter')
    return
  }
  if (useCache?.format !== 'boolean') {
    t.fail('Expected use_cache to be a boolean parameter')
    return
  }

  t.deepEqual(includeUnmanaged.values, [false])
  t.false('values' in useCache)
  t.true(useCache.hasDefault)
  t.is(useCache.default, false)
})

test('createBlueprint: preserves boolean constraints in nested and flattened schemas', async (t) => {
  const blueprint = await createBlueprintWithFooProperties(t, {
    status_updates: {
      type: 'array',
      items: {
        discriminator: { propertyName: 'kind' },
        oneOf: [
          {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['connected_account'] },
              is_connected_account_error: {
                type: 'boolean',
                enum: [true],
              },
            },
            required: ['kind', 'is_connected_account_error'],
          },
        ],
      },
    },
    scalar_union: {
      oneOf: [
        { type: 'boolean', enum: [true] },
        { type: 'boolean', enum: [false] },
      ],
    },
    all_of_flags: {
      allOf: [
        {
          type: 'object',
          properties: {
            is_enabled: { type: 'boolean', enum: [true] },
          },
        },
        {
          type: 'object',
          properties: {
            is_enabled: { type: 'boolean', enum: [false] },
          },
        },
      ],
    },
    one_of_flags: {
      oneOf: [
        {
          type: 'object',
          properties: {
            is_enabled: { type: 'boolean', enum: [true] },
          },
        },
        {
          type: 'object',
          properties: {
            is_enabled: { type: 'boolean', enum: [false] },
          },
        },
      ],
    },
  })

  const properties = blueprint.resources.find(
    ({ resourceType }) => resourceType === 'foo',
  )?.properties
  const statusUpdates = properties?.find(
    ({ name }) => name === 'status_updates',
  )
  if (
    statusUpdates?.format !== 'list' ||
    statusUpdates.itemFormat !== 'discriminated_object'
  ) {
    t.fail('Expected status_updates to be a discriminated list property')
    return
  }

  const variantProperties = statusUpdates.variants[0]?.properties
  const nestedBoolean = variantProperties?.find(
    ({ name }) => name === 'is_connected_account_error',
  )
  const kind = variantProperties?.find(({ name }) => name === 'kind')
  if (nestedBoolean?.format !== 'boolean' || kind?.format !== 'enum') {
    t.fail('Expected boolean and string discriminants to retain their formats')
    return
  }

  t.deepEqual(nestedBoolean.values, [true])
  t.deepEqual(
    kind.values.map(({ name }) => name),
    ['connected_account'],
  )

  const scalarUnion = properties?.find(({ name }) => name === 'scalar_union')
  if (scalarUnion?.format !== 'boolean') {
    t.fail('Expected scalar_union to be a boolean property')
    return
  }
  t.deepEqual(scalarUnion.values, [true, false])

  for (const name of ['all_of_flags', 'one_of_flags']) {
    const container = properties?.find((property) => property.name === name)
    if (container?.format !== 'object') {
      t.fail(`Expected ${name} to be an object property`)
      continue
    }

    const nestedProperty = container.properties.find(
      ({ name }) => name === 'is_enabled',
    )
    if (nestedProperty?.format !== 'boolean') {
      t.fail(`Expected ${name}.is_enabled to be a boolean property`)
      continue
    }

    t.deepEqual(nestedProperty.values, [true, false])
  }
})
