import type { OpenapiSchema } from 'lib/openapi/types.js'

export function findCommonOpenapiSchemaProperties(
  schemas: OpenapiSchema[],
): Record<string, OpenapiSchema> {
  const firstSchema = schemas[0]
  if (schemas.length === 0 || firstSchema?.properties == null) {
    return {}
  }

  return Object.entries(firstSchema.properties).reduce<
    Record<string, OpenapiSchema>
  >((commonProps, [propKey, propValue]) => {
    const isPropInAllSchemas = schemas.every((schema) =>
      Object.keys(schema.properties ?? {}).includes(propKey),
    )

    if (!isPropInAllSchemas) {
      return commonProps
    }

    if ('enum' in propValue) {
      const mergedEnumValues = schemas.reduce<string[]>((allEnums, schema) => {
        const enumValues = schema.properties?.[propKey]?.enum ?? []
        return [...new Set([...allEnums, ...enumValues])]
      }, [])

      return {
        ...commonProps,
        [propKey]: { ...propValue, enum: mergedEnumValues },
      }
    }

    return { ...commonProps, [propKey]: propValue }
  }, {})
}
