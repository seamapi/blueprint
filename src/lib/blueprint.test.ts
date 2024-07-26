import test from 'ava'

import { createProperties } from 'lib/blueprint.js'
import type { OpenapiSchema } from 'lib/openapi.js'

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
