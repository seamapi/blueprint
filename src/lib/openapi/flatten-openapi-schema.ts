import type { OpenapiEnumValue, OpenapiSchema } from './types.js'

type ScalarType = 'string' | 'number' | 'integer' | 'boolean'

// Ordered widest first. Every JSON scalar has a faithful string rendering, so
// string is the safest common supertype, and number subsumes integer.
const scalarTypes: ScalarType[] = ['string', 'number', 'integer', 'boolean']

const isScalarSchema = (
  schema: OpenapiSchema,
): schema is OpenapiSchema & { type: ScalarType } =>
  schema.type != null && scalarTypes.includes(schema.type as ScalarType)

const annotationKeys = [
  'x-undocumented',
  'x-deprecated',
  'x-draft',
  'x-end-of-life',
] as const

const pickAnnotations = (schema: OpenapiSchema): OpenapiSchema =>
  Object.fromEntries(
    annotationKeys.flatMap((key) =>
      schema[key] == null ? [] : [[key, schema[key]]],
    ),
  )

const visibilityKeys = ['x-undocumented', 'x-end-of-life'] as const
const enumVisibilityKeys = {
  'x-undocumented': 'undocumented',
  'x-end-of-life': 'end_of_life',
} as const

// Project visibility when contributors are merged, without removing any schemas.
export const projectVisibility = (
  projected: OpenapiSchema,
  contributors: OpenapiSchema[],
  intersection: boolean,
): OpenapiSchema => {
  const result = { ...projected }
  for (const key of visibilityKeys) {
    if (
      intersection
        ? contributors.some((s) => s[key])
        : contributors.every((s) => s[key])
    ) {
      const message = contributors.find((s) => s[key])?.[key]
      if (message != null) result[key] = message
    } else if (!intersection) {
      delete result[key]
    }
  }
  if (projected.enum == null) return result

  const enumMetadata = Object.fromEntries(
    projected.enum.map((literal) => {
      const name = String(literal)
      const matching = contributors.filter((s) => s.enum?.includes(literal))
      const entry = {
        ...matching.findLast((s) => s['x-enums']?.[name] != null)?.[
          'x-enums'
        ]?.[name],
      }
      for (const schemaKey of visibilityKeys) {
        const key = enumVisibilityKeys[schemaKey]
        const messages = matching.map(
          (s) => s[schemaKey] || s['x-enums']?.[name]?.[key],
        )
        if (
          messages.length > 0 &&
          (intersection ? messages.some(Boolean) : messages.every(Boolean))
        ) {
          const message = messages.find(Boolean)
          if (message != null) entry[key] = message
        } else {
          delete entry[key]
        }
      }
      return [name, entry]
    }),
  )
  if (
    Object.values(enumMetadata).some((entry) => Object.keys(entry).length > 0)
  ) {
    result['x-enums'] = enumMetadata
  } else {
    delete result['x-enums']
  }
  return result
}

type TaggedArrayItems = OpenapiSchema &
  Required<Pick<OpenapiSchema, 'discriminator' | 'oneOf'>>

// Only flattened tagged arrays with shared object fields need their contributors
// to resolve which object definition survives Blueprint omission.
export const taggedArrayItems = new WeakMap<OpenapiSchema, TaggedArrayItems>()

const getTaggedArrayItems = (
  items: OpenapiSchema,
): TaggedArrayItems | undefined => {
  const { oneOf, discriminator } = items
  if (oneOf == null || discriminator == null || oneOf.length < 2) {
    return undefined
  }
  const tags = new Set<string>()
  const fields = new Map<string, OpenapiSchema['type']>()
  let sharedObject = false
  for (const branch of oneOf) {
    const tag = branch.properties?.[discriminator.propertyName]
    const literal = tag?.enum?.[0]
    if (
      branch.type !== 'object' ||
      branch.properties == null ||
      tag?.type !== 'string' ||
      tag.enum?.length !== 1 ||
      typeof literal !== 'string' ||
      tags.has(literal)
    ) {
      return undefined
    }
    tags.add(literal)
    for (const [name, field] of Object.entries(branch.properties)) {
      if (fields.has(name)) {
        if (fields.get(name) !== field.type) return undefined
        if (field.type === 'object') sharedObject = true
      }
      fields.set(name, field.type)
    }
  }
  return sharedObject ? { ...items, oneOf, discriminator } : undefined
}

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
    const items = flattenOpenapiSchema(schema.items)
    const contributors =
      taggedArrayItems.get(schema.items) ?? getTaggedArrayItems(schema.items)
    if (contributors != null) taggedArrayItems.set(items, contributors)
    return { ...schema, items }
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
    ...pickAnnotations(schema),
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

  Object.assign(
    flattenedSchema,
    projectVisibility(flattenedSchema, flattenedSubschemas, true),
  )
  for (const [name, prop] of Object.entries(flattenedSchema.properties)) {
    const fields = flattenedSubschemas.flatMap(
      (schema) => schema.properties?.[name] ?? [],
    )
    flattenedSchema.properties[name] = projectVisibility(prop, fields, true)
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
    ...pickAnnotations(schema),
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
      ...projectVisibility(
        { type: enumType, enum: mergedEnums },
        flattenedSubschemas,
        false,
      ),
      ...baseFlattenedSchema,
    }
  } else if (flattenedSubschemas.every(isScalarSchema)) {
    return {
      ...baseFlattenedSchema,
      ...projectVisibility(
        flattenScalarSubschemas(flattenedSubschemas),
        flattenedSubschemas,
        false,
      ),
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

    for (const [name, prop] of Object.entries(mergedProperties)) {
      const contributors = flattenedSubschemas.flatMap((schema) => {
        const field = schema.properties?.[name]
        return field == null
          ? []
          : [
              {
                ...field,
                ...Object.fromEntries(
                  visibilityKeys.flatMap((key) =>
                    schema[key] ? [[key, schema[key]]] : [],
                  ),
                ),
              },
            ]
      })
      // The legacy projection cannot describe different types for the same field.
      if (contributors.every((field) => field.type === prop.type)) {
        mergedProperties[name] = projectVisibility(prop, contributors, false)
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
      ...(schema.discriminator != null && {
        discriminator: schema.discriminator,
      }),
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
