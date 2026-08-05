import type { OpenapiOperation, OpenapiSchema } from './types.js'

export const getRequestBodySchema = (
  operation: OpenapiOperation,
): OpenapiSchema | undefined =>
  operation.requestBody?.content?.['application/json']?.schema

export const schemaRequiresAnyProperty = (
  schema: OpenapiSchema | undefined,
): boolean => {
  if (schema == null) return false

  if ((schema.required ?? []).length > 0) return true

  const branches = schema.oneOf ?? schema.anyOf
  if (branches == null || branches.length === 0) return false

  return branches.every((branch) => schemaRequiresAnyProperty(branch))
}
