import type { OpenapiEnumValue, OpenapiSchema } from 'lib/openapi/types.js'

import { projectVisibility } from './flatten-openapi-schema.js'

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
    const contributors = schemas.flatMap(
      (schema) => schema.properties?.[propKey] ?? [],
    )
    if (contributors.length !== schemas.length) {
      return commonProps
    }

    if ('enum' in propValue) {
      const mergedEnumValues = schemas.reduce<OpenapiEnumValue[]>(
        (allEnums, schema) => {
          const enumValues = schema.properties?.[propKey]?.enum ?? []
          return [...new Set([...allEnums, ...enumValues])]
        },
        [],
      )

      return {
        ...commonProps,
        [propKey]: projectVisibility(
          { ...propValue, enum: mergedEnumValues },
          contributors,
          false,
        ),
      }
    }

    return {
      ...commonProps,
      [propKey]: projectVisibility(propValue, contributors, false),
    }
  }, {})
}
