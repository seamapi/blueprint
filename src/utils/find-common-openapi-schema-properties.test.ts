import test from 'ava'

import type { OpenapiSchema } from 'lib/openapi.js'

import { findCommonOpenapiSchemaProperties } from './find-common-openapi-schema-properties.js'

test('findCommonOpenapiSchemaProperties: extracts common properties from openapi schemas', (t) => {
  const schemas: OpenapiSchema[] = [
    {
      type: 'object',
      properties: {
        event_id: { type: 'string', format: 'uuid' },
        event_type: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        foo_id: { type: 'string' },
      },
    },
    {
      type: 'object',
      properties: {
        event_id: { type: 'string', format: 'uuid' },
        event_type: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        bar_id: { type: 'string' },
      },
    },
  ]

  const commonProps = findCommonOpenapiSchemaProperties(schemas)
  const commonKeys = Object.keys(commonProps)

  t.is(commonKeys.length, 3)
  t.true(
    ['event_id', 'event_type', 'created_at'].every((key) =>
      commonKeys.includes(key),
    ),
  )
})
