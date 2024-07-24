export default {
  openapi: '3.0.0',
  info: { title: 'Foo', version: '1.0.0' },
  servers: [{ url: 'https://example.com' }],
  tags: [{ description: 'foos', name: '/foos' }],
  components: {
    schemas: {
      foo: {
        type: 'object',
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
          deprecated_field: {
            description: 'This field is deprecated',
            type: 'string',
            'x-deprecated': 'This field will be removed in the next version',
          },
          undocumented_field: {
            description: 'This field is undocumented',
            type: 'string',
            'x-undocumented': true,
          },
        },
        required: ['foo_id', 'name'],
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
            description: 'OK',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [],
        summary: '/foos/get',
        tags: ['/foos'],
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
            description: 'OK',
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
        },
        security: [],
        summary: '/foos/get',
        tags: ['/foos'],
        'x-deprecated': 'Use GET method instead',
      },
    },
  },
}
