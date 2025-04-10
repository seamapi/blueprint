export default {
  openapi: '3.0.0',
  info: { title: 'Foo', version: '1.0.0' },
  servers: [{ url: 'https://example.com' }],
  tags: [{ description: 'foos', name: '/foos' }],
  components: {
    schemas: {
      pagination: {
        type: 'object',
        description: 'A pagination resource.',
        properties: {
          has_next_page: {
            description: 'If there is a next page',
            type: 'boolean',
          },
        },
      },
      foo: {
        type: 'object',
        description: 'A foo resource.',
        properties: {
          foo_id: {
            description: 'Foo id',
            format: 'uuid',
            type: 'string',
            'x-property-group-key': 'foo_group',
          },
          foo_type: {
            description: 'Foo type',
            type: 'string',
            enum: ['foo_basic', 'foo_advanced'],
            'x-enums': {
              foo_basic: {
                description: 'Use a basic foo',
              },
              foo_advanced: {
                description: 'Use an advanced foo',
                deprecated: 'Advanced foo is deprecated',
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
        'x-property-groups': {
          foo_group: {
            name: 'Foo Group',
          },
        },
      },
      plane: {
        type: 'object',
        description: 'A plane resource.',
        properties: {
          plane_id: {
            description: 'plane id',
            format: 'uuid',
            type: 'string',
            'x-property-group-key': 'plane_group',
          },
          name: {
            description: 'Planej name',
            type: 'string',
          },
        },
        required: ['plane_id', 'name'],
        'x-route-path': '/transport/air/planes',
        'x-property-groups': {
          plane_group: {
            name: 'Plane Group',
          },
        },
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
        'x-route-path': '/deprecated/undocumented',
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
        'x-route-path': '/draft',
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
        'x-route-path': '/deprecated/undocumented',
      },
      event: {
        'x-route-path': '/events',
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
      action_attempt: {
        'x-route-path': '/action_attempts',
        oneOf: [
          {
            type: 'object',
            properties: {
              action_attempt_id: {
                type: 'string',
                format: 'uuid',
              },
              status: {
                type: 'string',
                enum: ['pending'],
              },
              result: {
                nullable: true,
              },
              error: {
                nullable: true,
              },
              action_type: {
                type: 'string',
                enum: ['CREATE_FOO'],
              },
            },
            required: [
              'action_attempt_id',
              'status',
              'result',
              'error',
              'action_type',
            ],
          },
          {
            type: 'object',
            properties: {
              action_attempt_id: {
                type: 'string',
                format: 'uuid',
              },
              status: {
                type: 'string',
                enum: ['success'],
              },
              result: {
                nullable: true,
              },
              error: {
                nullable: true,
              },
              action_type: {
                type: 'string',
                enum: ['CREATE_FOO'],
              },
            },
            required: [
              'action_attempt_id',
              'status',
              'result',
              'error',
              'action_type',
            ],
          },
          {
            type: 'object',
            properties: {
              action_attempt_id: {
                type: 'string',
                format: 'uuid',
              },
              status: {
                type: 'string',
                enum: ['error'],
              },
              result: {
                nullable: true,
              },
              error: {
                nullable: true,
              },
              action_type: {
                type: 'string',
                enum: ['CREATE_FOO'],
              },
            },
            required: [
              'action_attempt_id',
              'status',
              'result',
              'error',
              'action_type',
            ],
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
    '/foos/create': {
      post: {
        operationId: 'foosCreatePost',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    ok: { type: 'boolean' },
                    action_attempt: {
                      $ref: '#/components/schemas/action_attempt',
                    },
                  },
                  required: ['action_attempt', 'ok'],
                  type: 'object',
                },
              },
            },
            description: 'Create a foo.',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [],
        summary: '/foos/create',
        tags: ['/foos'],
        'x-response-key': 'action_attempt',
        'x-action-attempt-type': 'CREATE_FOO',
        'x-title': 'Create a foo',
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
                    pagination: {
                      $ref: '#/components/schemas/pagination',
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
    '/action_attempts/get': {
      post: {
        operationId: 'actionAttemptsGetPost',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    ok: { type: 'boolean' },
                    action_attempt: {
                      $ref: '#/components/schemas/action_attempt',
                    },
                  },
                  required: ['action_attempt', 'ok'],
                  type: 'object',
                },
              },
            },
            description: 'Get an action attempt.',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [
          {
            api_key: [],
          },
        ],
        summary: '/action_attempts/get',
        tags: ['/action_attempts'],
        'x-response-key': 'action_attempt',
        'x-title': 'Get an action attempt',
      },
    },
  },
}
