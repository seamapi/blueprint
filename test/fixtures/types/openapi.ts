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
          foo_type: {
            description: 'Foo type',
            type: 'string',
            enum: ['foo_basic', 'foo_advanced'],
            'x-enums': {
              foo_basic: {
                title: 'Basic Foo',
                description: 'Use a basic foo',
              },
              foo_advanced: {
                title: 'Advanced Foo',
                description: 'Use an advanced foo',
                deprecated: 'Advanced foo will be deprecated soon',
              },
            },
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
          draft_prop: {
            description: 'This prop is draft',
            type: 'string',
            'x-draft': 'This prop is intentionally left draft.',
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
        'x-route-path': '/foos',
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
        'x-route-path': '/planes',
      },
      deprecated_resource: {
        type: 'object',
        description: 'A deprecated resource.',
        properties: {
          deprecated_resource_id: {
            description: 'Deprecated resource id',
            format: 'uuid',
            type: 'string',
          },
        },
        required: ['deprecated_resource_id'],
        deprecated: true,
        'x-deprecated': 'This resource is deprecated',
        'x-route-path': '/deprecated/resources',
      },
      draft_resource: {
        type: 'object',
        description: 'A draft resource.',
        properties: {
          draft_resource_id: {
            description: 'Draft resource id',
            format: 'uuid',
            type: 'string',
          },
        },
        required: ['draft_resource_id'],
        'x-draft': 'This resource is draft',
        'x-route-path': '/draft/resources',
      },
      undocumented_resource: {
        type: 'object',
        description: 'A undocumented resource.',
        properties: {
          undocumented_resource_id: {
            description: 'Undocumented resource id',
            format: 'uuid',
            type: 'string',
          },
        },
        required: ['undocumented_resource_id'],
        'x-undocumented': 'This resource is undocumented',
        'x-route-path': '/undocumented/resources',
      },
      event: {
        oneOf: [
          {
            type: 'object',
            description: 'A foo.created event',
            properties: {
              event_id: {
                description: 'Event ID',
                format: 'uuid',
                type: 'string',
              },
              event_type: {
                description: 'Type of event',
                type: 'string',
                enum: ['foo.created'],
              },
              foo_id: {
                description: 'ID of the foo that was created',
                format: 'uuid',
                type: 'string',
              },
              created_at: {
                description: 'When the event occurred',
                type: 'string',
                format: 'date-time',
              },
            },
            required: ['event_id', 'event_type', 'foo_id', 'created_at'],
            'x-route-path': '/foos',
          },
        ],
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
        security: [
          {
            api_key: [],
          },
        ],
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
        security: [
          {
            api_key: [],
          },
          {
            client_session: [],
          },
        ],
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
        'x-response-key': null,
        'x-undocumented': 'true',
        'x-title': 'Deprecated and undocumented endpoint',
      },
    },
    '/draft/endpoint': {
      get: {
        operationId: 'draftEndpointGet',
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
            description: 'Draft endpoint',
          },
        },
        security: [],
        summary: '/draft/endpoint',
        tags: ['/draft'],
        'x-response-key': null,
        'x-draft': 'true',
        'x-title': 'Draft endpoint',
      },
    },
  },
}
