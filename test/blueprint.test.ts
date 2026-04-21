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
