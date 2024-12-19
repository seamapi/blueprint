import type { OpenapiSchema } from 'lib/openapi.js'

export function findCommonOpenapiSchemaProperties(
  schemas: OpenapiSchema[],
): Record<string, OpenapiSchema> {
  if (schemas.length === 0 || schemas[0]?.properties == null) {
    return {}
  }

  const firstSchema = schemas[0]
  if (firstSchema.properties == null) {
    return {}
  }

  const firstSchemaPropKeys = Object.keys(firstSchema.properties)

  const commonPropKeys = firstSchemaPropKeys.filter((propKey) =>
    schemas.every((schema) =>
      Object.keys(schema.properties ?? {}).includes(propKey),
    ),
  )

  return commonPropKeys.reduce<Record<string, OpenapiSchema>>(
    (result, propKey) => {
      const propValue = firstSchema.properties?.[propKey]
      if (propValue != null) {
        result[propKey] = propValue
      }
      return result
    },
    {},
  )
}
