import type { OpenapiSchema } from './types.js'

export const flattenOpenapiSchema = (schema: OpenapiSchema): OpenapiSchema => {
  if ('allOf' in schema && Array.isArray(schema.allOf)) {
    return flattenAllOfSchema(schema as { allOf: OpenapiSchema[] })
  } else if ('oneOf' in schema && Array.isArray(schema.oneOf)) {
    return flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  } else if (schema.type === 'object' && schema.properties != null) {
    const flattenedProperties: Record<string, OpenapiSchema> = {}

    for (const [propKey, propSchema] of Object.entries(schema.properties)) {
      flattenedProperties[propKey] = flattenOpenapiSchema(propSchema)
    }

    return { ...schema, properties: flattenedProperties }
  }
  return schema
}

export const flattenAllOfSchema = (schema: {
  allOf: OpenapiSchema[]
}): OpenapiSchema => {
  const flattenedSchema: Required<
    Pick<OpenapiSchema, 'type' | 'properties' | 'required'>
  > = {
    type: 'object',
    properties: {},
    required: [],
  }

  for (const subschema of schema.allOf) {
    const flattenedSubschema = flattenOpenapiSchema(subschema)

    if (flattenedSubschema.properties != null) {
      flattenedSchema.properties = {
        ...flattenedSchema.properties,
        ...flattenedSubschema.properties,
      }
    }

    if (
      flattenedSubschema.required != null &&
      Array.isArray(flattenedSubschema.required)
    ) {
      flattenedSchema.required = Array.from(
        new Set([...flattenedSchema.required, ...flattenedSubschema.required]),
      )
    }
  }

  return flattenedSchema
}

export const flattenOneOfSchema = (schema: {
  oneOf: OpenapiSchema[]
}): OpenapiSchema => {
  const flattenedSubschemas = schema.oneOf.map(flattenOpenapiSchema)

  if (
    flattenedSubschemas.every(
      (s) => s.type === 'string' && Array.isArray(s.enum),
    )
  ) {
    const mergedEnums = Array.from(
      new Set(flattenedSubschemas.flatMap((s) => s.enum ?? [])),
    )

    return { type: 'string', enum: mergedEnums }
  } else {
    let mergedProperties: Record<string, OpenapiSchema> = {}
    const requiredFieldsLists: string[][] = []

    for (const flattenedSubschema of flattenedSubschemas) {
      if (flattenedSubschema.properties != null) {
        mergedProperties = {
          ...mergedProperties,
          ...flattenedSubschema.properties,
        }
      }

      if (
        flattenedSubschema.required != null &&
        Array.isArray(flattenedSubschema.required)
      ) {
        requiredFieldsLists.push(flattenedSubschema.required)
      } else {
        requiredFieldsLists.push([])
      }
    }

    let commonRequiredFields: string[] = []
    if (requiredFieldsLists.length > 0) {
      commonRequiredFields = requiredFieldsLists.reduce(
        (commonRequired, currentRequiredFields) =>
          commonRequired.filter((field) =>
            currentRequiredFields.includes(field),
          ),
      )
    }

    return {
      type: 'object',
      properties: mergedProperties,
      required: commonRequiredFields,
    }
  }
}
