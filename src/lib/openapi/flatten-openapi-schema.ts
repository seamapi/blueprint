import type { OpenapiEnumValue, OpenapiSchema } from './types.js'

type ScalarType = 'string' | 'number' | 'integer' | 'boolean'

// Ordered widest first. Every JSON scalar has a faithful string rendering, so
// string is the safest common supertype, and number subsumes integer.
const scalarTypes: ScalarType[] = ['string', 'number', 'integer', 'boolean']

const isScalarSchema = (
  schema: OpenapiSchema,
): schema is OpenapiSchema & { type: ScalarType } =>
  schema.type != null && scalarTypes.includes(schema.type as ScalarType)

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
    ...(schema['x-property-groups'] != null && {
      'x-property-groups': schema['x-property-groups'],
    }),
  }

  const flattenedSubschemas = schema.allOf.map(flattenOpenapiSchema)

  const scalarSubschema = flattenedSubschemas.find(isScalarSchema)
  if (scalarSubschema != null) {
    throw new Error(
      `Cannot flatten an allOf containing the scalar type '${scalarSubschema.type}': an intersection of an object with a scalar has no object representation.`,
    )
  }

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
      const enumValues = new Set<OpenapiEnumValue>()

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
  const flattenedSubschemas = schema.oneOf.map(flattenOpenapiSchema)

  // A variant that is itself nullable makes the whole union nullable.
  const isNullable =
    schema.nullable === true ||
    flattenedSubschemas.some((s) => s.nullable === true)

  const baseFlattenedSchema: OpenapiSchema = {
    ...(schema?.description != null && { description: schema.description }),
    ...(isNullable && { nullable: true }),
  }

  const enumType = flattenedSubschemas[0]?.type
  if (
    (enumType === 'string' || enumType === 'boolean') &&
    flattenedSubschemas.every(
      (s) => s.type === enumType && Array.isArray(s.enum),
    )
  ) {
    const mergedEnums = Array.from(
      new Set(flattenedSubschemas.flatMap((s) => s.enum ?? [])),
    )

    return {
      ...baseFlattenedSchema,
      type: enumType,
      enum: mergedEnums,
    }
  } else if (flattenedSubschemas.every(isScalarSchema)) {
    return {
      ...baseFlattenedSchema,
      ...flattenScalarSubschemas(flattenedSubschemas),
    }
  } else if (flattenedSubschemas.some(isScalarSchema)) {
    const kinds = Array.from(
      new Set(flattenedSubschemas.map((s) => s.type ?? 'unknown')),
    )
    throw new Error(
      `Cannot flatten a oneOf mixing scalar and non-scalar variants (${kinds.join(', ')}): there is no single type that describes every variant.`,
    )
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
        const enumValues = new Set<OpenapiEnumValue>()

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

// A union of scalars is described by the narrowest type that still accepts every
// variant. Without this, a scalar union falls through to the object merge above
// and is reported as an object with no properties, which is not something the
// endpoint accepts at all.
const flattenScalarSubschemas = (
  subschemas: Array<OpenapiSchema & { type: ScalarType }>,
): OpenapiSchema => {
  const types = new Set(subschemas.map((s) => s.type))
  const type = scalarTypes.find((t) => types.has(t))
  if (type == null) {
    throw new Error('Expected at least one scalar subschema')
  }

  // Only variants of the resolved type constrain its format, and a variant with
  // no format is the unconstrained form of that type. So a single distinct
  // format is the most specific description of the union: `string` unioned with
  // a `date-time` string is still always a timestamp in practice. Competing
  // formats have no common refinement, leaving the bare type.
  const formats = new Set(
    subschemas
      .filter((s) => s.type === type)
      .map((s) => s.format)
      .filter((format) => format != null),
  )
  const [format] = formats

  return {
    type,
    ...(formats.size === 1 && { format }),
  }
}
