import type { OpenapiSchema } from './types.js'

export const flattenOpenapiSchema = (schema: OpenapiSchema): OpenapiSchema => {
  if ('allOf' in schema && Array.isArray(schema.allOf)) {
    return flattenAllOfSchema(schema as { allOf: OpenapiSchema[] })
  }

  if ('oneOf' in schema && Array.isArray(schema.oneOf)) {
    return flattenOneOfSchema(schema as { oneOf: OpenapiSchema[] })
  }

  if (schema.type === 'object' && schema.properties != null) {
    const flattenedProperties: Record<string, OpenapiSchema> = {}

    for (const [propKey, propSchema] of Object.entries(schema.properties)) {
      flattenedProperties[propKey] = flattenOpenapiSchema(propSchema)
    }

    return { ...schema, properties: flattenedProperties }
  }

  if (schema.type === 'array' && schema.items != null) {
    return { ...schema, items: flattenOpenapiSchema(schema.items) }
  }

  return schema
}

type AllOfSchema = OpenapiSchema & Required<Pick<OpenapiSchema, 'allOf'>>

export const flattenAllOfSchema = (schema: AllOfSchema): OpenapiSchema => {
  const flattenedSchema: OpenapiSchema &
    Required<Pick<OpenapiSchema, 'type' | 'properties' | 'required'>> = {
    type: 'object',
    properties: {},
    required: [],
    ...(schema?.description != null && { description: schema.description }),
  }

  const flattenedSubschemas = schema.allOf.map(flattenOpenapiSchema)

  for (const flattenedSubschema of flattenedSubschemas) {
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

  for (const [propKey, propSchema] of Object.entries(
    flattenedSchema.properties,
  )) {
    if ('enum' in propSchema && Array.isArray(propSchema.enum)) {
      const enumValues = new Set<string>()

      for (const subschema of flattenedSubschemas) {
        const enumProp = subschema.properties?.[propKey]
        if (
          enumProp != null &&
          'enum' in enumProp &&
          Array.isArray(enumProp.enum)
        ) {
          enumProp.enum.forEach((val) => enumValues.add(val))
        }
      }

      flattenedSchema.properties[propKey] = {
        ...propSchema,
        enum: Array.from(enumValues),
      }
    }
  }

  return flattenedSchema
}

type OneOfSchema = OpenapiSchema & Required<Pick<OpenapiSchema, 'oneOf'>>

export const flattenOneOfSchema = (schema: OneOfSchema): OpenapiSchema => {
  const baseFlattenedSchema: OpenapiSchema = {
    ...(schema?.description != null && { description: schema.description }),
  }
  const flattenedSubschemas = schema.oneOf.map(flattenOpenapiSchema)

  if (
    flattenedSubschemas.every(
      (s) => s.type === 'string' && Array.isArray(s.enum),
    )
  ) {
    const mergedEnums = Array.from(
      new Set(flattenedSubschemas.flatMap((s) => s.enum ?? [])),
    )

    return {
      ...baseFlattenedSchema,
      type: 'string',
      enum: mergedEnums,
    }
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

    for (const [propKey, propSchema] of Object.entries(mergedProperties)) {
      if ('enum' in propSchema && Array.isArray(propSchema.enum)) {
        const enumValues = new Set<string>()

        for (const subschema of flattenedSubschemas) {
          const enumProp = subschema.properties?.[propKey]
          if (
            enumProp != null &&
            'enum' in enumProp &&
            Array.isArray(enumProp.enum)
          ) {
            enumProp.enum.forEach((val) => enumValues.add(val))
          }
        }

        mergedProperties[propKey] = {
          ...propSchema,
          enum: Array.from(enumValues),
        }
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
      ...baseFlattenedSchema,
      type: 'object',
      properties: mergedProperties,
      required: commonRequiredFields,
    }
  }
}
