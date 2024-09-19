export default {
  openapi: '3.0.0',
  info: { title: 'Foo', version: '1.0.0' },
  servers: [{ url: 'https://example.com' }],
  tags: [{ description: 'foos', name: '/foos' }],
  components: {
    schemas: {
      foo: {
        type: 'object',
        description: 'A foo resource.',
        properties: {
          foo_id: {
            description: 'Foo id',
            format: 'uuid',
            type: 'string',
          },
          name: {
            description: 'Foo name',
            type: 'string',
          },
          deprecated_prop: {
            description: 'This prop is deprecated',
            type: 'string',
            'x-deprecated': 'This prop will be removed in the next version',
          },
          undocumented_prop: {
            description: 'This prop is undocumented',
            type: 'string',
            'x-undocumented': 'This prop is intentionally left undocumented.',
          },
          nullable_prop: {
            description: 'This prop is nullable',
            type: 'string',
            nullable: true,
          },
          number_prop: {
            description: 'This prop is a number',
            type: 'number',
            format: 'float',
          },
          object_prop: {
            type: 'object',
            properties: { foo: { type: 'string' } },
          },
          array_prop: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['foo_id', 'name'],
      },
      plane: {
        type: 'object',
        description: 'A plane resource.',
        properties: {
          plane_id: {
            description: 'plane id',
            format: 'uuid',
            type: 'string',
          },
          name: {
            description: 'Planej name',
            type: 'string',
          },
        },
        required: ['plane_id', 'name'],
      },
    },
  },
  paths: {
    '/foos/get': {
      get: {
        operationId: 'foosGetGet',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    ok: { type: 'boolean' },
                    foo: { $ref: '#/components/schemas/foo' },
                  },
                  required: ['foo', 'ok'],
                  type: 'object',
                },
              },
            },
            description: 'Get a foo by ID.',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [],
        summary: '/foos/get',
        tags: ['/foos'],
        'x-response-key': 'foo',
        'x-title': 'Get a foo',
      },
      post: {
        operationId: 'foosGetPost',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    ok: { type: 'boolean' },
                    foo: { $ref: '#/components/schemas/foo' },
                  },
                  required: ['foo', 'ok'],
                  type: 'object',
                },
              },
            },
            description: 'Get a foo by ID.',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [],
        summary: '/foos/get',
        tags: ['/foos'],
        'x-response-key': 'foo',
        'x-title': 'Get a foo',
      },
    },
    '/foos/list': {
      get: {
        operationId: 'foosListGet',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    ok: { type: 'boolean' },
                    foos: {
                      items: { $ref: '#/components/schemas/foo' },
                      type: 'array',
                    },
                  },
                  required: ['foos', 'ok'],
                  type: 'object',
                },
              },
            },
            description: 'List all foos.',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [],
        summary: '/foos/list',
        tags: ['/foos'],
        'x-response-key': 'foos',
        'x-title': 'List foos',
      },
      post: {
        operationId: 'foosListPost',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    ok: { type: 'boolean' },
                    foos: {
                      items: { $ref: '#/components/schemas/foo' },
                      type: 'array',
                    },
                  },
                  required: ['foos', 'ok'],
                  type: 'object',
                },
              },
            },
            description: 'List all foos.',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [],
        summary: '/foos/list',
        tags: ['/foos'],
        'x-response-key': 'foos',
        'x-title': 'List foos',
      },
    },
    '/transport/air/planes/list': {
      get: {
        operationId: 'planesListGet',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    ok: { type: 'boolean' },
                    planes: {
                      items: { $ref: '#/components/schemas/plane' },
                      type: 'array',
                    },
                  },
                  required: ['planes', 'ok'],
                  type: 'object',
                },
              },
            },
            description: 'List all planes.',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [],
        summary: '/transport/air/planes/list',
        tags: ['/transport/air/planes'],
        'x-response-key': 'planes',
        'x-title': 'List planes',
      },
    },
    '/deprecated/undocumented/endpoint': {
      get: {
        operationId: 'deprecatedUndocumentedEndpointGet',
        deprecated: true,
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
            description: 'Deprecated and undocumented endpoint',
          },
        },
        security: [],
        summary: '/deprecated/undocumented/endpoint',
        tags: ['/deprecated/undocumented'],
        'x-undocumented': 'true',
        'x-title': 'Deprecated and undocumented endpoint',
      },
    },
  },
}
