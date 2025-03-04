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
  t.truthy(flattened.properties)
  if (flattened.properties?.['status'] != null) {
    const statusProp = flattened.properties['status'] as OpenapiSchema & {
      enum: string[]
    }
    t.deepEqual(statusProp.enum, ['pending', 'processing', 'completed'])
  } else {
    t.fail('Expected "status" property to exist')
  }
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
  t.truthy(flattened.properties)

  if (flattened.properties != null) {
    if (flattened.properties['status'] != null) {
      const statusProp = flattened.properties['status'] as OpenapiSchema & {
        enum: string[]
      }
      t.deepEqual(statusProp.enum, ['pending', 'processing', 'completed'])
    } else {
      t.fail('Expected "status" property to exist')
    }

    if (flattened.properties['type'] != null) {
      const typeProp = flattened.properties['type'] as OpenapiSchema & {
        enum: string[]
      }
      t.deepEqual(typeProp.enum, ['type1', 'type2', 'type3'])
    } else {
      t.fail('Expected "type" property to exist')
    }
  } else {
    t.fail('Expected properties to exist')
  }
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
  t.truthy(flattened.properties)
  t.deepEqual(flattened.properties?.['foo'], {
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
