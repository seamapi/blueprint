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
