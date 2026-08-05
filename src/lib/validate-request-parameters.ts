import {
  getRequestBodySchema,
  schemaRequiresAnyProperty,
} from './openapi/get-request-body-schema.js'
import { OpenapiOperationSchema } from './openapi/schemas.js'
import type { OpenapiPaths } from './openapi/types.js'

export const assertRequestParameterAnnotationsMatchSchemas = (
  paths: OpenapiPaths,
): void => {
  const offenders: string[] = []

  for (const [path, pathItem] of Object.entries(paths)) {
    const operation = pathItem.post
    if (operation == null) continue

    const parsedOperation = OpenapiOperationSchema.parse(operation, {
      path: path.split('/'),
    })

    if (parsedOperation['x-has-required-parameters'] !== false) continue

    const schema = getRequestBodySchema(operation)
    if (!schemaRequiresAnyProperty(schema)) continue

    const required = schema?.required ?? []
    const reason =
      required.length > 0
        ? `requires ${required.join(', ')}`
        : 'has a request body whose every variant requires at least one property'

    offenders.push(
      `${path} sets 'x-has-required-parameters: false' but ${reason}`,
    )
  }

  if (offenders.length > 0) {
    throw new Error(
      `Endpoints annotated as having no required parameters must accept an empty request. Found:\n${offenders.join('\n')}`,
    )
  }
}
