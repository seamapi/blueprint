import test from 'ava'

import type { OpenapiPaths, OpenapiSchema } from 'lib/openapi/types.js'
import { assertRequestParameterAnnotationsMatchSchemas } from 'lib/validate-request-parameters.js'

const createPaths = (
  schema: OpenapiSchema,
  hasRequiredParameters?: boolean,
): OpenapiPaths =>
  ({
    '/foos/get': {
      post: {
        operationId: 'foosGetPost',
        responses: { 200: { description: 'OK' } },
        ...(hasRequiredParameters != null && {
          'x-has-required-parameters': hasRequiredParameters,
        }),
        requestBody: { content: { 'application/json': { schema } } },
      },
    },
  }) as unknown as OpenapiPaths

const allOptionalSchema: OpenapiSchema = {
  type: 'object',
  properties: { device_id: { type: 'string' }, name: { type: 'string' } },
}

const requiredPropertySchema: OpenapiSchema = {
  type: 'object',
  properties: { device_id: { type: 'string' } },
  required: ['device_id'],
}

const everyBranchRequiredSchema: OpenapiSchema = {
  oneOf: [
    {
      type: 'object',
      properties: { access_grant_id: { type: 'string' } },
      required: ['access_grant_id'],
    },
    {
      type: 'object',
      properties: { access_grant_key: { type: 'string' } },
      required: ['access_grant_key'],
    },
  ],
}

test('assertRequestParameterAnnotationsMatchSchemas: passes when unannotated', (t) => {
  t.notThrows(() => {
    assertRequestParameterAnnotationsMatchSchemas(
      createPaths(requiredPropertySchema),
    )
  })
})

test('assertRequestParameterAnnotationsMatchSchemas: passes when annotated false and nothing is required', (t) => {
  t.notThrows(() => {
    assertRequestParameterAnnotationsMatchSchemas(
      createPaths(allOptionalSchema, false),
    )
  })
})

test('assertRequestParameterAnnotationsMatchSchemas: passes when annotated true alongside a required property', (t) => {
  t.notThrows(() => {
    assertRequestParameterAnnotationsMatchSchemas(
      createPaths(requiredPropertySchema, true),
    )
  })
})

test('assertRequestParameterAnnotationsMatchSchemas: throws when annotated false but a property is required', (t) => {
  const error = t.throws(() => {
    assertRequestParameterAnnotationsMatchSchemas(
      createPaths(requiredPropertySchema, false),
    )
  })

  t.true(error?.message.includes('/foos/get'))
  t.true(error?.message.includes('requires device_id'))
})

test('assertRequestParameterAnnotationsMatchSchemas: throws when annotated false but every union variant requires a property', (t) => {
  const error = t.throws(() => {
    assertRequestParameterAnnotationsMatchSchemas(
      createPaths(everyBranchRequiredSchema, false),
    )
  })

  t.true(error?.message.includes('every variant requires'))
})

test('assertRequestParameterAnnotationsMatchSchemas: passes when only some union variants require a property', (t) => {
  t.notThrows(() => {
    assertRequestParameterAnnotationsMatchSchemas(
      createPaths(
        {
          oneOf: [
            {
              type: 'object',
              properties: { device_id: { type: 'string' } },
              required: ['device_id'],
            },
            { type: 'object', properties: { name: { type: 'string' } } },
          ],
        },
        false,
      ),
    )
  })
})
