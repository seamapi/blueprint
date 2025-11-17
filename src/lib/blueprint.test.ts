import test from 'ava'

import {
  createProperties,
  getPreferredMethod,
  getSemanticMethod,
  getWorkspaceScope,
  type Method,
} from 'lib/blueprint.js'
import type {
  OpenapiAuthMethod,
  OpenapiOperation,
  OpenapiSchema,
} from 'lib/openapi/types.js'

test('createProperties: assigns appropriate default values', (t) => {
  const minimalProperties = {
    minimalProperty: {
      type: 'string',
    },
  }

  const properties = createProperties(
    minimalProperties as Record<string, OpenapiSchema>,
    ['foo'],
    {},
    [],
  )

  t.is(properties.length, 1, 'Should create one property')
  const [property] = properties
  if (property === undefined) {
    t.fail('Property should not be undefined')
    return
  }
  t.is(property.format, 'string', 'Property format should be string')
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
      'x-draft': 'true',
    },
  }

  const properties = createProperties(
    fullProperties as Record<string, OpenapiSchema>,
    ['foo'],
    {},
    [],
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
  t.true(property.isDraft, 'isDraft should be true when x-draft is provided')
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

test('getSemanticMethod: post only', (t) => {
  const postOnlyMethods: Method[] = ['POST']
  t.is(
    getSemanticMethod(postOnlyMethods),
    'POST',
    'Semantic method should be POST when only POST is available',
  )
})

test('getPreferredMethod: post only', (t) => {
  const postOnlyMethods: Method[] = ['POST']
  t.is(
    getPreferredMethod(postOnlyMethods, 'POST', postEndpoint),
    'POST',
    'Preferred method should be POST when only POST is available',
  )
})

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

test('getSemanticMethod: get and post', (t) => {
  const bothMethods: Method[] = ['GET', 'POST']
  t.is(
    getSemanticMethod(bothMethods),
    'GET',
    'Semantic method should be GET when both GET and POST are available',
  )
})

test('getPreferredMethod: get and post without complex parameters', (t) => {
  const bothMethods: Method[] = ['GET', 'POST']
  t.is(
    getPreferredMethod(bothMethods, 'GET', getPostEndpoint),
    'GET',
    'Preferred method should be GET when both methods are available and no complex parameters',
  )
})

const getPostComplexParamsEndpoint: OpenapiOperation = {
  ...getPostEndpoint,
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            complexParam: { type: 'object' },
          },
        },
      },
    },
  },
}

test('getPreferredMethod: get and post with complex parameters', (t) => {
  const bothMethods: Method[] = ['GET', 'POST']
  t.is(
    getPreferredMethod(bothMethods, 'GET', getPostComplexParamsEndpoint),
    'POST',
    'Preferred method should be POST when both GET and POST are available and complex parameters are present',
  )
})

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

test('getSemanticMethod: patch and post', (t) => {
  const patchPostMethods: Method[] = ['PATCH', 'POST']
  t.is(
    getSemanticMethod(patchPostMethods),
    'PATCH',
    'Semantic method should be PATCH when both PATCH and POST are available',
  )
})

test('getPreferredMethod: patch and post', (t) => {
  const patchPostMethods: Method[] = ['PATCH', 'POST']
  t.is(
    getPreferredMethod(patchPostMethods, 'PATCH', patchPostEndpoint),
    'PATCH',
    'Preferred method should be PATCH when both PATCH and POST are available',
  )
})

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

test('getSemanticMethod: delete and post', (t) => {
  const deletePostMethods: Method[] = ['DELETE', 'POST']
  t.is(
    getSemanticMethod(deletePostMethods),
    'DELETE',
    'Semantic method should be DELETE when both DELETE and POST are available',
  )
})

test('getPreferredMethod: delete and post', (t) => {
  const deletePostMethods: Method[] = ['DELETE', 'POST']
  t.is(
    getPreferredMethod(deletePostMethods, 'DELETE', deletePostEndpoint),
    'POST',
    'Preferred method should be POST when both DELETE and POST are available',
  )
})

test('getWorkspaceScope: no auth methods', (t) => {
  const authMethods: OpenapiAuthMethod[] = []
  t.is(
    getWorkspaceScope(authMethods),
    'none',
    'Workspace scope should be "none" when no auth methods are present',
  )
})

test('getWorkspaceScope: only unscoped auth methods', (t) => {
  const authMethods: OpenapiAuthMethod[] = [
    'pat_without_workspace',
    'console_session_token_without_workspace',
  ]
  t.is(
    getWorkspaceScope(authMethods),
    'none',
    'Workspace scope should be "none" when only unscoped auth methods are present',
  )
})

test('getWorkspaceScope: only scoped auth methods', (t) => {
  const authMethods: OpenapiAuthMethod[] = [
    'api_key',
    'client_session',
    'pat_with_workspace',
  ]
  t.is(
    getWorkspaceScope(authMethods),
    'required',
    'Workspace scope should be "required" when only scoped auth methods are present',
  )
})

test('getWorkspaceScope: both scoped and unscoped auth methods', (t) => {
  const authMethods: OpenapiAuthMethod[] = [
    'pat_with_workspace',
    'pat_without_workspace',
  ]
  t.is(
    getWorkspaceScope(authMethods),
    'optional',
    'Workspace scope should be "optional" when both scoped and unscoped auth methods are present',
  )
})
