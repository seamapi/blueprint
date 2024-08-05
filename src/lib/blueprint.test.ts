import test from 'ava'

import {
  createProperties,
  getPreferredMethod,
  getSemanticMethod,
  type Method,
} from 'lib/blueprint.js'
import type { OpenapiOperation, OpenapiSchema } from 'lib/openapi.js'

test('createProperties: assigns appropriate default values', (t) => {
  const minimalProperties = {
    minimalProperty: {
      type: 'string',
    },
  }

  const properties = createProperties(
    minimalProperties as Record<string, OpenapiSchema>,
  )

  t.is(properties.length, 1, 'Should create one property')
  const [property] = properties
  if (property === undefined) {
    t.fail('Property should not be undefined')
    return
  }
  t.is(property.type, 'string', 'Property type should be string')
  t.is(property.description, '', 'Description should default to empty string')
  t.false(property.isDeprecated, 'isDeprecated should default to false')
  t.is(
    property.deprecationMessage,
    '',
    'deprecationMessage should default to empty string',
  )
  t.false(property.isUndocumented, 'isUndocumented should default to false')
})

test('createProperties: uses provided values', (t) => {
  const fullProperties = {
    fullProperty: {
      type: 'string',
      description: 'Test description',
      deprecated: true,
      'x-deprecated': 'This property is deprecated',
      'x-undocumented': 'true',
    },
  }

  const properties = createProperties(
    fullProperties as Record<string, OpenapiSchema>,
  )

  t.is(properties.length, 1, 'Should create one property')
  const [property] = properties
  if (property === undefined) {
    t.fail('Property should not be undefined')
    return
  }
  t.is(
    property.description,
    'Test description',
    'Description should match provided value',
  )
  t.true(
    property.isDeprecated,
    'isDeprecated should be true when deprecated is true',
  )
  t.is(
    property.deprecationMessage,
    'This property is deprecated',
    'deprecationMessage should match x-deprecated value',
  )
  t.true(
    property.isUndocumented,
    'isUndocumented should be true when x-undocumented is provided',
  )
})

const postEndpoint: OpenapiOperation = {
  summary: '/users/create',
  responses: {
    '200': {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            properties: {
              user: {
                $ref: '#/components/schemas/user',
                type: 'object',
              },
              ok: {
                type: 'boolean',
              },
            },
            required: ['user', 'ok'],
          },
        },
      },
    },
  },
  operationId: 'usersCreatePost',
}

const getPostEndpoint: OpenapiOperation = {
  summary: '/workspaces/get',
  responses: {
    '200': {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              workspace: {
                type: 'object',
                $ref: '#/components/schemas/workspace',
              },
              ok: {
                type: 'boolean',
              },
            },
            required: ['workspace', 'ok'],
          },
        },
      },
    },
  },
  operationId: 'workspacesGetPost',
}

const patchPostEndpoint: OpenapiOperation = {
  summary: '/user_identities/update',
  responses: {
    '200': {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            properties: {
              ok: {
                type: 'boolean',
              },
            },
            required: ['ok'],
          },
        },
      },
    },
    '400': {
      description: 'Bad Request',
    },
    '401': {
      description: 'Unauthorized',
    },
  },
  security: [
    { pat_with_workspace: [] },
    { console_session: [] },
    { api_key: [] },
  ],
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            user_identity_id: {
              type: 'string',
              format: 'uuid',
            },
            user_identity_key: {
              type: 'string',
            },
            email_address: {
              type: 'string',
              format: 'email',
            },
            phone_number: {
              type: 'string',
            },
            full_name: {
              type: 'string',
            },
          },
          required: ['user_identity_id'],
        },
      },
    },
  },
  tags: ['/user_identities'],
  operationId: 'userIdentitiesUpdatePost',
}

const deletePostEndpoint: OpenapiOperation = {
  summary: '/user_identities/delete',
  responses: {
    '200': {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            properties: {
              ok: {
                type: 'boolean',
              },
            },
            required: ['ok'],
          },
        },
      },
    },
    '400': {
      description: 'Bad Request',
    },
    '401': {
      description: 'Unauthorized',
    },
  },
  security: [
    { api_key: [] },
    { pat_with_workspace: [] },
    { console_session: [] },
  ],
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            user_identity_id: {
              type: 'string',
              format: 'uuid',
            },
          },
          required: ['user_identity_id'],
        },
      },
    },
  },
  tags: ['/user_identities'],
  operationId: 'userIdentitiesDeletePost',
}

const putPatchPostEndpoint: OpenapiOperation = {
  summary: '/access_codes/update',
  responses: {
    '200': {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              action_attempt: {
                $ref: '#/components/schemas/action_attempt',
              },
              ok: {
                type: 'boolean',
              },
            },
            required: ['action_attempt', 'ok'],
          },
        },
      },
    },
    '400': {
      description: 'Bad Request',
    },
    '401': {
      description: 'Unauthorized',
    },
  },
  security: [
    { client_session: [] },
    { pat_with_workspace: [] },
    { console_session: [] },
    { api_key: [] },
  ],
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            starts_at: { type: 'string' },
            ends_at: { type: 'string' },
            code: {
              type: 'string',
            },
            sync: {
              type: 'boolean',
            },
            access_code_id: {
              type: 'string',
              format: 'uuid',
            },
          },
          required: ['access_code_id'],
        },
      },
    },
  },
  tags: ['/access_codes'],
  operationId: 'accessCodesUpdatePost',
}

test('Method detection for different endpoints', (t) => {
  // only POST method available
  const postOnlyMethods: Method[] = ['POST']
  t.is(
    getSemanticMethod(postOnlyMethods),
    'POST',
    'Semantic method should be POST when only POST is available',
  )
  t.is(
    getPreferredMethod(postOnlyMethods, 'POST', postEndpoint),
    'POST',
    'Preferred method should be POST when only POST is available',
  )

  // both GET and POST methods available
  const bothMethods: Method[] = ['GET', 'POST']
  t.is(
    getSemanticMethod(bothMethods),
    'GET',
    'Semantic method should be GET when both GET and POST are available',
  )
  t.is(
    getPreferredMethod(bothMethods, 'GET', getPostEndpoint),
    'GET',
    'Preferred method should be GET when both methods are available and no complex parameters',
  )

  // PATCH and POST methods available
  const patchPostMethods: Method[] = ['PATCH', 'POST']
  t.is(
    getSemanticMethod(patchPostMethods),
    'PATCH',
    'Semantic method should be PATCH when both PATCH and POST are available',
  )
  t.is(
    getPreferredMethod(patchPostMethods, 'PATCH', patchPostEndpoint),
    'PATCH',
    'Preferred method should be PATCH when both PATCH and POST are available',
  )

  // DELETE and POST methods available
  const deletePostMethods: Method[] = ['DELETE', 'POST']
  t.is(
    getSemanticMethod(deletePostMethods),
    'DELETE',
    'Semantic method should be DELETE when both DELETE and POST are available',
  )
  t.is(
    getPreferredMethod(deletePostMethods, 'DELETE', deletePostEndpoint),
    'POST',
    'Preferred method should be POST when both DELETE and POST are available',
  )

  // more than two methods available
  const putPatchPostMethods: Method[] = ['PUT', 'PATCH', 'POST']
  t.is(
    getSemanticMethod(putPatchPostMethods),
    'PUT',
    'Semantic method should be PUT when PUT, PATCH and POST are available',
  )
  t.is(
    getPreferredMethod(putPatchPostMethods, 'PUT', putPatchPostEndpoint),
    'PUT',
    'Preferred method should be PUT when PUT, PATCH and POST are available',
  )
})
