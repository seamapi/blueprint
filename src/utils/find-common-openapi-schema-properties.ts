import type { OpenapiSchema } from 'lib/openapi.js'

export function findCommonOpenapiSchemaProperties(
  schemas: OpenapiSchema[],
): Record<string, OpenapiSchema> {
  const firstSchema = schemas[0]
  if (schemas.length === 0 || !firstSchema?.properties) {
    return {}
  }

  return Object.entries(firstSchema.properties).reduce<
    Record<string, OpenapiSchema>
  >((commonProps, [propKey, propValue]) => {
    const isPropInAllSchemas = schemas.every((schema) =>
      Object.keys(schema.properties ?? {}).includes(propKey),
    )

    return isPropInAllSchemas
      ? { ...commonProps, [propKey]: propValue }
      : commonProps
  }, {})
}
