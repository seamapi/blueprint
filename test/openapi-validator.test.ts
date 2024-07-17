import test from 'ava'

import { openapiOperationSchemaValidator } from 'lib/openapi.js'

test('applies default values for x-undocumented and x-deprecated', (t) => {
  const basicOperation = {
    operationId: 'basicOp',
    responses: {
      '200': {
        description: 'OK',
      },
    },
  }

  const result = openapiOperationSchemaValidator.safeParse(basicOperation)
  t.true(result.success)
  if (result.success) {
    t.is(
      result.data['x-undocumented'],
      'true',
      'x-undocumented should default to "true"',
    )
    t.is(
      result.data['x-deprecated'],
      'false',
      'x-deprecated should default to "false"',
    )
  }
})
