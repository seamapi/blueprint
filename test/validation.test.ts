import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

import * as types from './fixtures/types/index.js'

test('createBlueprint', (t) => {
  const blueprint = createBlueprint(types)

  t.is(blueprint.title, 'Foo')

  // Test resources
  t.truthy(blueprint.resources['foo'], 'Blueprint should have a "foo" resource')
  const fooResource = blueprint.resources['foo']
  t.is(fooResource?.resourceType, 'foo', 'Foo resource type should be "foo"')
  t.is(
    fooResource?.properties.length,
    4,
    'Foo resource should have 4 properties',
  )

  const nameProperty = fooResource?.properties.find((p) => p.name === 'name')
  t.truthy(nameProperty, 'Name property should exist')
  if (nameProperty != null) {
    t.is(nameProperty.type, 'string', 'Name property should be of type string')
    t.is(
      nameProperty.description,
      'Foo name',
      'Name property should have correct description',
    )
    t.false(nameProperty.isDeprecated, 'Name property should not be deprecated')
    t.is(
      nameProperty.deprecationMessage,
      '',
      'Name property should have empty deprecation message',
    )
    t.false(
      nameProperty.isUndocumented,
      'Name property should not be undocumented',
    )
  }

  // Test deprecated property
  const deprecatedProperty = fooResource?.properties.find(
    (p) => p.name === 'deprecated_prop',
  )
  t.truthy(deprecatedProperty, 'Deprecated property should exist')
  t.is(
    deprecatedProperty?.type,
    'string',
    'Deprecated property should be of type string',
  )
  t.is(
    deprecatedProperty?.description,
    'This prop is deprecated',
    'Deprecated property should have correct description',
  )
  t.true(
    deprecatedProperty?.isDeprecated,
    'Deprecated property isDeprecated flag should be true',
  )
  t.is(
    deprecatedProperty?.deprecationMessage,
    'This prop will be removed in the next version',
    'Deprecated property should have correct deprecation message',
  )
  t.false(
    deprecatedProperty?.isUndocumented,
    'Deprecated property should not be undocumented',
  )

  // Test undocumented property
  const undocumentedProperty = fooResource?.properties.find(
    (p) => p.name === 'undocumented_prop',
  )
  t.truthy(undocumentedProperty, 'Undocumented property should exist')
  t.is(
    undocumentedProperty?.type,
    'string',
    'Undocumented property should be of type string',
  )
  t.is(
    undocumentedProperty?.description,
    'This prop is undocumented',
    'Undocumented property should have correct description',
  )
  t.false(
    undocumentedProperty?.isDeprecated,
    'Undocumented property should not be deprecated',
  )
  t.is(
    undocumentedProperty?.deprecationMessage,
    '',
    'Undocumented property should have empty deprecation message',
  )
  t.true(
    undocumentedProperty?.isUndocumented,
    'Undocumented property should be marked as undocumented',
  )
})
