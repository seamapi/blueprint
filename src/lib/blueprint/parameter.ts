import { flattenOpenapiSchema } from 'lib/openapi/flatten-openapi-schema.js'
import { PropertySchema } from 'lib/openapi/schemas.js'
import type { OpenapiOperation, OpenapiSchema } from 'lib/openapi/types.js'

// Parameter Types
interface BaseParameter {
  name: string
  description: string
  isRequired: boolean
  isDeprecated: boolean
  deprecationMessage: string
  isUndocumented: boolean
  undocumentedMessage: string
  isDraft: boolean
  draftMessage: string
  hasDefault: boolean
}

interface StringParameter extends BaseParameter {
  format: 'string'
  jsonType: 'string'
  default?: string | null
}

interface NumberParameter extends BaseParameter {
  format: 'number'
  jsonType: 'number'
  default?: number | null
}

interface EnumParameter extends BaseParameter {
  format: 'enum'
  jsonType: 'string'
  values: EnumValue[]
  default?: string | null
}

interface RecordParameter extends BaseParameter {
  format: 'record'
  jsonType: 'object'
}

interface BaseListParameter extends BaseParameter {
  format: 'list'
  jsonType: 'array'
}

type ListParameter =
  | StringListParameter
  | NumberListParameter
  | BooleanListParameter
  | DatetimeListParameter
  | IdListParameter
  | EnumListParameter
  | ObjectListParameter
  | RecordListParameter
  | DiscriminatedListParameter

interface StringListParameter extends BaseListParameter {
  itemFormat: 'string'
  default?: string[]
}

interface NumberListParameter extends BaseListParameter {
  itemFormat: 'number'
  default?: number[]
}

interface BooleanListParameter extends BaseListParameter {
  itemFormat: 'boolean'
  default?: boolean[]
}

interface DatetimeListParameter extends BaseListParameter {
  itemFormat: 'datetime'
  default?: string[]
}

interface IdListParameter extends BaseListParameter {
  itemFormat: 'id'
  default?: string[]
}

interface EnumListParameter extends BaseListParameter {
  itemFormat: 'enum'
  itemEnumValues: EnumValue[]
  default?: EnumValue[]
}

interface ObjectListParameter extends BaseListParameter {
  itemFormat: 'object'
  itemParameters: Parameter[]
}

interface RecordListParameter extends BaseListParameter {
  itemFormat: 'record'
}

interface DiscriminatedListParameter extends BaseListParameter {
  itemFormat: 'discriminated_object'
  discriminator: string
  variants: Array<{
    parameters: Parameter[]
    description: BaseParameter['description']
  }>
}

interface BooleanParameter extends BaseParameter {
  format: 'boolean'
  jsonType: 'boolean'
  default?: boolean | null
}

interface ObjectParameter extends BaseParameter {
  format: 'object'
  jsonType: 'object'
  parameters: Parameter[]
}

interface DatetimeParameter extends BaseParameter {
  format: 'datetime'
  jsonType: 'string'
  default?: string | null
}

interface IdParameter extends BaseParameter {
  format: 'id'
  jsonType: 'string'
  default?: string | null
}

export type Parameter =
  | StringParameter
  | NumberParameter
  | EnumParameter
  | RecordParameter
  | ListParameter
  | BooleanParameter
  | ObjectParameter
  | DatetimeParameter
  | IdParameter

// Shared types
interface EnumValue {
  name: string
  description: string
  isDeprecated: boolean
  deprecationMessage: string
  isUndocumented: boolean
  undocumentedMessage: string
  isDraft: boolean
  draftMessage: string
}

// Utility function
const normalizeDescription = (content: string): string => content

// Parameter creation functions
export const createRequestBody = (
  operation: OpenapiOperation,
  path: string,
): Parameter[] => {
  // This should be done by the createParameters but for some reason it's not
  // TODO: remove this in favour of using createParameters
  if (!('requestBody' in operation) || operation.requestBody === undefined) {
    return []
  }

  const requestBody = operation.requestBody
  const jsonSchema = requestBody.content?.['application/json']?.schema
  if (jsonSchema == null) return []

  const flattenedSchema = flattenOpenapiSchema(jsonSchema)
  if (flattenedSchema.type !== 'object' || flattenedSchema.properties == null) {
    return []
  }

  return createParameters(
    flattenedSchema.properties,
    path,
    flattenedSchema.required,
  )
}

export const createParameters = (
  properties: Record<string, OpenapiSchema>,
  path: string,
  requiredParameters: string[] = [],
): Parameter[] => {
  return Object.entries(properties)
    .map(([name, property]) => {
      // Don't flatten discriminated arrays as they are handled separately in createParameter
      if (
        property.type === 'array' &&
        'items' in property &&
        'discriminator' in property.items
      ) {
        return [name, property] as [string, OpenapiSchema]
      }

      return [name, flattenOpenapiSchema(property)] as [string, OpenapiSchema]
    })
    .filter(([name, property]) => {
      if (property.type == null) {
        // eslint-disable-next-line no-console
        console.warn(
          `The ${name} property for ${path} will not be documented since it does not define a type.`,
        )
        return false
      }
      return true
    })
    .map(([name, property]) =>
      createParameter(name, property, path, requiredParameters),
    )
}

const createParameter = (
  name: string,
  property: OpenapiSchema,
  path: string,
  requiredParameters: string[],
): Parameter => {
  const parsedProp = PropertySchema.parse(property, {
    path: [...path.split('/'), name],
  })

  const baseParam: BaseParameter & {
    default?: any
  } = {
    name,
    description: normalizeDescription(String(parsedProp.description ?? '')),
    isRequired: requiredParameters.includes(name),
    isDeprecated: parsedProp['x-deprecated'].length > 0,
    deprecationMessage: parsedProp['x-deprecated'],
    isUndocumented: parsedProp['x-undocumented'].length > 0,
    undocumentedMessage: parsedProp['x-undocumented'],
    isDraft: parsedProp['x-draft'].length > 0,
    draftMessage: parsedProp['x-draft'],
    hasDefault: 'default' in parsedProp,
  }

  if (baseParam.hasDefault) {
    baseParam.default = parsedProp.default
  }

  switch (parsedProp.type) {
    case 'string':
      if (parsedProp.enum !== undefined) {
        return {
          ...baseParam,
          format: 'enum',
          jsonType: 'string',
          values: parsedProp.enum.map((value: string | boolean) => {
            const enumValue = parsedProp['x-enums']?.[String(value)]
            if (parsedProp['x-enums'] != null && enumValue == null) {
              throw new Error(
                `Missing enum value definition in x-enums for "${String(value)}"`,
              )
            }
            return {
              name: String(value),
              description: normalizeDescription(
                String(enumValue?.description ?? ''),
              ),
              isDeprecated: Boolean(enumValue?.deprecated?.length ?? 0),
              deprecationMessage: enumValue?.deprecated ?? '',
              isUndocumented: Boolean(enumValue?.undocumented?.length ?? 0),
              undocumentedMessage: enumValue?.undocumented ?? '',
              isDraft: Boolean(enumValue?.draft?.length ?? 0),
              draftMessage: enumValue?.draft ?? '',
            }
          }),
        }
      }
      if (parsedProp.format === 'date-time') {
        return { ...baseParam, format: 'datetime', jsonType: 'string' }
      }
      if (parsedProp.format === 'uuid') {
        return { ...baseParam, format: 'id', jsonType: 'string' }
      }
      return { ...baseParam, format: 'string', jsonType: 'string' }
    case 'boolean':
      return { ...baseParam, format: 'boolean', jsonType: 'boolean' }
    case 'array': {
      return createArrayParameter(baseParam, property, path)
    }
    case 'object':
      if (property.properties !== undefined) {
        return {
          ...baseParam,
          format: 'object',
          jsonType: 'object',
          parameters: createParameters(property.properties, path),
        }
      }
      return { ...baseParam, format: 'record', jsonType: 'object' }
    case 'number':
    case 'integer':
      return {
        ...baseParam,
        format: 'number',
        jsonType: 'number',
      }
    default:
      throw new Error(`Unsupported property type: ${parsedProp.type}`)
  }
}

const createArrayParameter = (
  baseParam: BaseParameter,
  property: OpenapiSchema,
  path: string,
): Parameter => {
  function createListParameter<T extends BaseListParameter>(
    format: string,
    extraProps: Partial<T> = {},
  ): T {
    return {
      ...baseParam,
      format: 'list' as const,
      jsonType: 'array' as const,
      itemFormat: format,
      ...extraProps,
    } as unknown as T
  }

  const fallbackListParameter =
    createListParameter<RecordListParameter>('record')

  if (property.items == null) {
    return fallbackListParameter
  }

  if ('oneOf' in property.items) {
    if (
      !property.items.oneOf.every(
        (schema: OpenapiSchema) => schema.type === 'object',
      )
    ) {
      return fallbackListParameter
    }

    if (property.items.discriminator?.propertyName == null) {
      throw new Error(
        `Missing discriminator property name for ${baseParam.name} in ${path}`,
      )
    }

    return createListParameter<DiscriminatedListParameter>(
      'discriminated_object',
      {
        discriminator: property.items.discriminator.propertyName,
        variants: property.items.oneOf.map((schema: OpenapiSchema) => ({
          parameters: createParameters(
            schema.properties ?? {},
            path,
            schema.required ?? [],
          ),
          description: normalizeDescription(schema.description ?? ''),
        })),
      },
    )
  }

  const itemParameter = createParameter('item', property.items, path, [])

  switch (itemParameter.format) {
    case 'string':
      return createListParameter<StringListParameter>('string')

    case 'number':
      return createListParameter<NumberListParameter>('number')

    case 'boolean':
      return createListParameter<BooleanListParameter>('boolean')

    case 'datetime':
      return createListParameter<DatetimeListParameter>('datetime')

    case 'id':
      return createListParameter<IdListParameter>('id')

    case 'enum':
      return createListParameter<EnumListParameter>('enum', {
        itemEnumValues: itemParameter.values,
      })

    case 'object':
      return createListParameter<ObjectListParameter>('object', {
        itemParameters: itemParameter.parameters,
      })

    case 'record':
      return createListParameter<RecordListParameter>('record')

    default:
      return fallbackListParameter
  }
}
