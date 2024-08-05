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

const postOnlyEndpoint: OpenapiOperation = {
  summary: '/users/create',
  responses: {
    '200': {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
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

test('Method detection for different endpoints', (t) => {
  // only POST method available
  const postOnlyMethods: Method[] = ['POST']
  t.is(
    getSemanticMethod(postOnlyMethods),
    'POST',
    'Semantic method should be POST when only POST is available',
  )
  t.is(
    getPreferredMethod(postOnlyMethods, 'POST', postOnlyEndpoint),
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
})
