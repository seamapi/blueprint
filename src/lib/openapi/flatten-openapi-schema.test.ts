import test from 'ava'

import {
  flattenAllOfSchema,
  flattenOneOfSchema,
  flattenOpenapiSchema,
} from './flatten-openapi-schema.js'
import type { OpenapiSchema } from './types.js'

test('flattenOpenapiSchema: returns schema unchanged if no allOf/oneOf', (t) => {
  const schema: OpenapiSchema = { type: 'string', enum: ['foo'] }
  const flattened = flattenOpenapiSchema(schema)
  t.deepEqual(flattened, schema)
})

test('flattenAllOfSchema: merges properties and required fields', (t) => {
  const schema = {
    allOf: [
      {
        type: 'object',
        properties: { a: { type: 'string', description: 'desc A' } },
        required: ['a'],
      },
      {
        type: 'object',
        properties: { b: { type: 'number', description: 'desc B' } },
        required: ['b'],
      },
    ],
  }
  const flattened = flattenAllOfSchema(schema as { allOf: OpenapiSchema[] })

  t.is(flattened.type, 'object')
  t.truthy(flattened.properties)
  t.deepEqual(flattened.properties, {
    a: { type: 'string', description: 'desc A' },
    b: { type: 'number', description: 'desc B' },
  })
  t.deepEqual(flattened.required, ['a', 'b'])
})

test('flattenAllOfSchema: merges enum values from properties', (t) => {
  const schema = {
    allOf: [
      {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'processing'],
          },
        },
      },
      {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['processing', 'completed'],
          },
        },
      },
    ],
  }
  const flattened = flattenAllOfSchema(schema as { allOf: OpenapiSchema[] })

  t.is(flattened.type, 'object')

  if (flattened.properties == null) {
    t.fail('Expected properties to exist')
    return
  }

  if (flattened.properties['status'] == null) {
    t.fail('Expected "status" property to exist')
    return
  }

  const statusProp = flattened.properties['status'] as OpenapiSchema & {
    enum: string[]
  }
  t.deepEqual(statusProp.enum, ['pending', 'processing', 'completed'])
})

test('flattenOneOfSchema (string enums): merges enums and deduplicates', (t) => {
  const schema: OpenapiSchema = {
    oneOf: [
      { type: 'string', enum: ['foo', 'bar'] },
      { type: 'string', enum: ['bar', 'baz'] },
    ],
  }
  const flattened = flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  t.is(flattened.type, 'string')
  t.deepEqual(flattened.enum, ['foo', 'bar', 'baz'])
})

test('flattenOneOfSchema (object merging): merges properties and computes required intersection', (t) => {
  const schema: OpenapiSchema = {
    oneOf: [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        required: ['a'],
      },
      {
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'number' } },
        required: ['a', 'b'],
      },
    ],
  }
  const flattened = flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  t.is(flattened.type, 'object')
  t.deepEqual(flattened.properties, {
    a: { type: 'string' },
    b: { type: 'number' },
  })
  // Intersection of ['a'] and ['a', 'b'] should yield ['a'].
  t.deepEqual(flattened.required, ['a'])
})

test('flattenOneOfSchema (object merging): merges enum values from properties', (t) => {
  const schema: OpenapiSchema = {
    oneOf: [
      {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'processing'],
          },
          type: {
            type: 'string',
            enum: ['type1', 'type2'],
          },
        },
      },
      {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['processing', 'completed'],
          },
          type: {
            type: 'string',
            enum: ['type2', 'type3'],
          },
        },
      },
    ],
  }
  const flattened = flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })

  t.is(flattened.type, 'object')

  if (flattened.properties == null) {
    t.fail('Expected properties to exist')
    return
  }

  if (flattened.properties['status'] == null) {
    t.fail('Expected "status" property to exist')
    return
  }

  const statusProp = flattened.properties['status'] as OpenapiSchema & {
    enum: string[]
  }
  t.deepEqual(statusProp.enum, ['pending', 'processing', 'completed'])

  if (flattened.properties['type'] == null) {
    t.fail('Expected "type" property to exist')
    return
  }

  const typeProp = flattened.properties['type'] as OpenapiSchema & {
    enum: string[]
  }
  t.deepEqual(typeProp.enum, ['type1', 'type2', 'type3'])
})

test('flattenOpenapiSchema: recursively flattens nested properties', (t) => {
  // Create an object schema that has a nested property using allOf.
  const schema: OpenapiSchema = {
    type: 'object',
    properties: {
      foo: {
        allOf: [
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
          },
          {
            type: 'object',
            properties: { b: { type: 'number' } },
            required: ['b'],
          },
        ],
      },
    },
  }
  const flattened = flattenOpenapiSchema(schema)
  t.is(flattened.type, 'object')

  if (flattened.properties == null) {
    t.fail('Expected properties to exist')
    return
  }

  if (flattened.properties['foo'] == null) {
    t.fail('Expected "foo" property to exist')
    return
  }

  t.deepEqual(flattened.properties['foo'], {
    type: 'object',
    properties: {
      a: { type: 'string' },
      b: { type: 'number' },
    },
    required: ['a', 'b'],
  })
})

test('flattenOpenapiSchema: oneOf nests allOf', (t) => {
  const schema: OpenapiSchema = {
    oneOf: [
      {
        allOf: [
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
          },
          {
            type: 'object',
            properties: { b: { type: 'number' } },
            required: ['b'],
          },
        ],
      },
      {
        allOf: [
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
          },
          {
            type: 'object',
            properties: { c: { type: 'boolean' } },
            required: ['c'],
          },
        ],
      },
    ],
  }
  const flattened = flattenOpenapiSchema(schema)
  t.deepEqual(flattened, {
    type: 'object',
    properties: {
      a: { type: 'string' },
      b: { type: 'number' },
      c: { type: 'boolean' },
    },
    required: ['a'],
  })
})

test('flattenOpenapiSchema: allOf with two oneOf schemas', (t) => {
  const schema: OpenapiSchema = {
    allOf: [
      {
        oneOf: [
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
          },
          {
            type: 'object',
            properties: { b: { type: 'number' } },
            required: ['b'],
          },
        ],
      },
      {
        oneOf: [
          {
            type: 'object',
            properties: { c: { type: 'boolean' } },
            required: ['c'],
          },
          {
            type: 'object',
            properties: { d: { type: 'string' } },
            required: ['d'],
          },
        ],
      },
    ],
  }
  const flattened = flattenOpenapiSchema(schema)
  t.deepEqual(flattened, {
    type: 'object',
    properties: {
      a: { type: 'string' },
      b: { type: 'number' },
      c: { type: 'boolean' },
      d: { type: 'string' },
    },
    required: [],
  })
})

test('flattenOneOfSchema (scalar union): keeps the only specific format', (t) => {
  const schema: OpenapiSchema = {
    oneOf: [{ type: 'string' }, { type: 'string', format: 'date-time' }],
  }
  const flattened = flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  t.deepEqual(flattened, { type: 'string', format: 'date-time' })
})

test('flattenOneOfSchema (scalar union): drops competing formats', (t) => {
  const schema: OpenapiSchema = {
    oneOf: [
      { type: 'string', format: 'date-time' },
      { type: 'string', format: 'uuid' },
    ],
  }
  const flattened = flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  t.deepEqual(flattened, { type: 'string' })
})

test('flattenOneOfSchema (scalar union): widens mixed scalar types', (t) => {
  t.deepEqual(
    flattenOneOfSchema({
      oneOf: [{ type: 'string' }, { type: 'boolean' }],
    } as { oneOf: OpenapiSchema[] }),
    { type: 'string' },
  )
  t.deepEqual(
    flattenOneOfSchema({
      oneOf: [{ type: 'number', format: 'float' }, { type: 'string' }],
    } as { oneOf: OpenapiSchema[] }),
    { type: 'string' },
  )
  t.deepEqual(
    flattenOneOfSchema({
      oneOf: [{ type: 'integer' }, { type: 'number' }],
    } as { oneOf: OpenapiSchema[] }),
    { type: 'number' },
  )
})

test('flattenOneOfSchema (scalar union): keeps the description', (t) => {
  const schema: OpenapiSchema = {
    description: 'Lower and upper timestamps.',
    oneOf: [{ type: 'string' }, { type: 'string', format: 'date-time' }],
  }
  const flattened = flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  t.deepEqual(flattened, {
    description: 'Lower and upper timestamps.',
    type: 'string',
    format: 'date-time',
  })
})

test('flattenOneOfSchema: preserves nullable from the union', (t) => {
  const schema: OpenapiSchema = {
    nullable: true,
    oneOf: [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        required: ['a'],
      },
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        required: ['a'],
      },
    ],
  }
  const flattened = flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  t.true(flattened.nullable)
})

test('flattenOneOfSchema: preserves nullable from a variant', (t) => {
  const schema: OpenapiSchema = {
    oneOf: [{ type: 'string' }, { type: 'string', nullable: true }],
  }
  const flattened = flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  t.true(flattened.nullable)
})

test('flattenOneOfSchema: throws when mixing scalar and object variants', (t) => {
  const schema: OpenapiSchema = {
    oneOf: [
      { type: 'string' },
      { type: 'object', properties: { a: { type: 'string' } } },
    ],
  }
  t.throws(() => flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] }), {
    message: /mixing scalar and non-scalar variants/,
  })
})

test('flattenAllOfSchema: throws when a subschema is a scalar', (t) => {
  const schema = {
    allOf: [
      { type: 'object', properties: { a: { type: 'string' } } },
      { type: 'string' },
    ],
  }
  t.throws(() => flattenAllOfSchema(schema as { allOf: OpenapiSchema[] }), {
    message: /scalar type 'string'/,
  })
})

test('flattenOpenapiSchema: flattens a tuple-encoded array of timestamps', (t) => {
  // A z.tuple of two `string | Date` positions: both positions produce the same
  // item schema, so they collapse to a single `oneOf` under `items`.
  const schema: OpenapiSchema = {
    description: 'Lower and upper timestamps.',
    type: 'array',
    minItems: 2,
    maxItems: 2,
    items: {
      oneOf: [{ type: 'string' }, { type: 'string', format: 'date-time' }],
    },
  } as OpenapiSchema
  const flattened = flattenOpenapiSchema(schema)
  t.deepEqual(flattened.items, { type: 'string', format: 'date-time' })
})
