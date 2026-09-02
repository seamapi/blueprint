import test from 'ava'

import {
  createParameters,
  createProperties,
  getSemanticMethod,
  getWorkspaceScope,
  type Method,
} from 'lib/blueprint.js'
import type { OpenapiAuthMethod, OpenapiSchema } from 'lib/openapi/types.js'

test('createProperties: assigns appropriate default values', (t) => {
  const minimalProperties = {
    minimal_property: {
      type: 'string',
    },
  }

  const properties = createProperties(
    minimalProperties as Record<string, OpenapiSchema>,
    ['foo'],
    [],
    {},
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
  t.false(
    property.isNullable,
    'isNullable should default to false when nullable is not set',
  )
  t.true(
    property.isOptional,
    'isOptional should default to true when the property is not required',
  )
})

test('createProperties: sets isOptional from the required list', (t) => {
  const properties = createProperties(
    {
      required_property: { type: 'string' },
      optional_property: { type: 'string' },
    } as Record<string, OpenapiSchema>,
    ['foo'],
    [],
    {},
    ['required_property'],
  )

  const requiredProperty = properties.find(
    (p) => p.name === 'required_property',
  )
  const optionalProperty = properties.find(
    (p) => p.name === 'optional_property',
  )

  t.false(
    requiredProperty?.isOptional,
    'isOptional should be false for properties in the required list',
  )
  t.true(
    optionalProperty?.isOptional,
    'isOptional should be true for properties absent from the required list',
  )
})

test('createProperties: sets isNullable from the nullable flag', (t) => {
  const properties = createProperties(
    {
      nullable_property: { type: 'string', nullable: true },
      non_nullable_property: { type: 'string', nullable: false },
    } as Record<string, OpenapiSchema>,
    ['foo'],
    [],
    {},
  )

  const nullableProperty = properties.find(
    (p) => p.name === 'nullable_property',
  )
  const nonNullableProperty = properties.find(
    (p) => p.name === 'non_nullable_property',
  )

  t.true(
    nullableProperty?.isNullable,
    'isNullable should be true when nullable is true',
  )
  t.false(
    nonNullableProperty?.isNullable,
    'isNullable should be false when nullable is false',
  )
})

test('createProperties: uses provided values', (t) => {
  const fullProperties = {
    full_property: {
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
    [],
    {},
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

test('createProperties: rejects names that are not lower_snake_case', (t) => {
  const error = t.throws(() =>
    createProperties({ fooBar: { type: 'string' } }, ['user'], [], {}),
  )

  t.is(
    error.message,
    "property name 'fooBar' in user must be lower_snake_case",
  )
})

test('createParameters: rejects names that are not lower_snake_case', (t) => {
  const error = t.throws(() =>
    createParameters({ fooBar: { type: 'string' } }, '/users/create'),
  )

  t.is(
    error.message,
    "parameter name 'fooBar' in /users/create must be lower_snake_case",
  )
})

test('createParameters: assigns appropriate default values', (t) => {
  const parameters = createParameters(
    {
      minimal_parameter: { type: 'string' },
    } as Record<string, OpenapiSchema>,
    '/foo',
  )

  t.is(parameters.length, 1, 'Should create one parameter')
  const [parameter] = parameters
  if (parameter === undefined) {
    t.fail('Parameter should not be undefined')
    return
  }
  t.false(
    parameter.isNullable,
    'isNullable should default to false when nullable is not set',
  )
  t.false(
    parameter.isRequired,
    'isRequired should default to false when the parameter is not required',
  )
})

test('record properties and parameters preserve their value types', (t) => {
  const schema: OpenapiSchema = {
    type: 'object',
    additionalProperties: {
      oneOf: [{ type: 'string' }, { type: 'boolean' }],
    },
  }

  const [property] = createProperties({ metadata: schema }, ['foo'], [], {})
  const [parameter] = createParameters({ metadata: schema }, '/foo')

  if (
    property?.format !== 'record' ||
    !('valueTypes' in property) ||
    parameter?.format !== 'record'
  ) {
    t.fail('Expected metadata to be a typed record')
    return
  }

  t.deepEqual(property.valueTypes, ['string', 'boolean'])
  t.deepEqual(parameter.valueTypes, ['string', 'boolean'])
})

test('createParameters: sets isNullable from the nullable flag', (t) => {
  const parameters = createParameters(
    {
      nullable_parameter: { type: 'string', nullable: true },
      non_nullable_parameter: { type: 'string', nullable: false },
      nullable_list_parameter: {
        type: 'array',
        nullable: true,
        items: { type: 'string' },
      },
      nullable_object_parameter: {
        type: 'object',
        nullable: true,
        properties: { a: { type: 'string' } },
      },
    } as Record<string, OpenapiSchema>,
    '/foo',
  )

  const findParameter = (name: string): boolean | undefined =>
    parameters.find((p) => p.name === name)?.isNullable

  t.true(
    findParameter('nullable_parameter'),
    'isNullable should be true when nullable is true',
  )
  t.false(
    findParameter('non_nullable_parameter'),
    'isNullable should be false when nullable is false',
  )
  t.true(
    findParameter('nullable_list_parameter'),
    'isNullable should be true for a nullable list parameter',
  )
  t.true(
    findParameter('nullable_object_parameter'),
    'isNullable should be true for a nullable object parameter',
  )
})

test('getSemanticMethod: post only', (t) => {
  const postOnlyMethods: Method[] = ['POST']
  t.is(
    getSemanticMethod(postOnlyMethods),
    'POST',
    'Semantic method should be POST when only POST is available',
  )
})

test('getSemanticMethod: get and post', (t) => {
  const bothMethods: Method[] = ['GET', 'POST']
  t.is(
    getSemanticMethod(bothMethods),
    'GET',
    'Semantic method should be GET when both GET and POST are available',
  )
})

test('getSemanticMethod: patch and post', (t) => {
  const patchPostMethods: Method[] = ['PATCH', 'POST']
  t.is(
    getSemanticMethod(patchPostMethods),
    'PATCH',
    'Semantic method should be PATCH when both PATCH and POST are available',
  )
})

test('getSemanticMethod: delete and post', (t) => {
  const deletePostMethods: Method[] = ['DELETE', 'POST']
  t.is(
    getSemanticMethod(deletePostMethods),
    'DELETE',
    'Semantic method should be DELETE when both DELETE and POST are available',
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
