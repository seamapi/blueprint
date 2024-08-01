import { z } from 'zod'

import {
  type CodeSample,
  CodeSampleDefinitionSchema,
  createCodeSample,
} from './code-sample/index.js'
import type { CodeSampleDefinition } from './code-sample/schema.js'
import type {
  Openapi,
  OpenapiOperation,
  OpenapiParameter,
  OpenapiPathItem,
  OpenapiPaths,
  OpenapiSchema,
} from './openapi.js'
import {
  OpenapiOperationSchema,
  ParameterSchema,
  PropertySchema,
} from './openapi-schema.js'

export interface Blueprint {
  title: string
  routes: Route[]
  resources: Record<string, Resource>
}

export interface Route {
  path: string
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[]
}

export interface Resource {
  resourceType: string
  properties: Property[]
}

export interface Namespace {
  path: string
}

export interface Endpoint {
  title: string
  path: string
  description: string
  isUndocumented: boolean
  isDeprecated: boolean
  deprecationMessage: string
  parameters: Parameter[]
  request: Request
  response: Response
  codeSamples: CodeSample[]
}

export interface Parameter {
  name: string
  isRequired: boolean
  isUndocumented: boolean
  isDeprecated: boolean
  deprecationMessage: string
  description: string
}

export interface Request {
  methods: Method[]
  semanticMethod: Method
  preferredMethod: Method
  parameters: Parameter[]
}

export type Response = VoidResponse | ResourceResponse | ResourceListResponse

interface BaseResponse {
  description: string
}

interface VoidResponse extends BaseResponse {
  responseType: 'void'
}

interface ResourceResponse extends BaseResponse {
  responseType: 'resource'
  responseKey: string
  resourceType: string
}

interface ResourceListResponse extends BaseResponse {
  responseType: 'resource_list'
  responseKey: string
  resourceType: string
}

interface BaseProperty {
  name: string
  description?: string
  isDeprecated: boolean
  deprecationMessage: string
  isUndocumented: boolean
}

export type Property =
  | StringProperty
  | EnumProperty
  | RecordProperty
  | ListProperty
  | ObjectProperty
  | BooleanProperty
  | DatetimeProperty
  | IdProperty

interface StringProperty extends BaseProperty {
  format: 'string'
  jsonType: 'string'
}

interface EnumProperty extends BaseProperty {
  format: 'enum'
  jsonType: 'string'
  values: EnumValue[]
}

interface EnumValue {
  name: string
}

interface RecordProperty extends BaseProperty {
  format: 'record'
  jsonType: 'object'
}

interface ListProperty extends BaseProperty {
  format: 'list'
  jsonType: 'array'
}

interface BooleanProperty extends BaseProperty {
  format: 'boolean'
  jsonType: 'boolean'
}

interface ObjectProperty extends BaseProperty {
  format: 'object'
  jsonType: 'object'
  properties: Property[]
}

interface DatetimeProperty extends BaseProperty {
  format: 'datetime'
  jsonType: 'string'
}

interface IdProperty extends BaseProperty {
  format: 'id'
  jsonType: 'string'
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface Context {
  codeSampleDefinitions: CodeSampleDefinition[]
}

export const TypesModuleSchema = z.object({
  codeSampleDefinitions: z.array(CodeSampleDefinitionSchema).default([]),
  // TODO: Import and use openapi zod schema here
  openapi: z.any(),
})

export type TypesModuleInput = z.input<typeof TypesModuleSchema>

export type TypesModule = z.output<typeof TypesModuleSchema>

export const createBlueprint = (typesModule: TypesModuleInput): Blueprint => {
  const { codeSampleDefinitions } = TypesModuleSchema.parse(typesModule)

  // TODO: Move openapi to TypesModuleSchema
  const openapi = typesModule.openapi as Openapi

  const isFakeData = openapi.info.title === 'Foo'
  const targetPath = '/acs/systems/list'
  const targetSchema = 'acs_system'

  const context = {
    codeSampleDefinitions,
  }

  return {
    title: openapi.info.title,
    routes: createRoutes(openapi.paths, isFakeData, targetPath, context),
    resources: createResources(
      openapi.components.schemas,
      isFakeData,
      targetSchema,
    ),
  }
}

const createRoutes = (
  paths: OpenapiPaths,
  isFakeData: boolean,
  targetPath: string,
  context: Context,
): Route[] => {
  return Object.entries(paths)
    .filter(([path]) => isFakeData || path === targetPath)
    .map(([path, pathItem]) => createRoute(path, pathItem, context))
}

const createRoute = (
  path: string,
  pathItem: OpenapiPathItem,
  context: Context,
): Route => {
  const pathParts = path.split('/')
  const routePath = `/${pathParts.slice(1, -1).join('/')}`

  return {
    path: routePath,
    namespace: { path: `/${pathParts[1]}` },
    endpoints: createEndpoints(path, pathItem, context),
    subroutes: [],
  }
}

const createEndpoints = (
  path: string,
  pathItem: OpenapiPathItem,
  context: Context,
): Endpoint[] => {
  return Object.entries(pathItem)
    .filter(
      ([, operation]) => typeof operation === 'object' && operation !== null,
    )
    .map(([method, operation]) =>
      createEndpoint(
        method as Method,
        operation as OpenapiOperation,
        path,
        context,
      ),
    )
}

const createEndpoint = (
  method: Method,
  operation: OpenapiOperation,
  path: string,
  context: Context,
): Endpoint => {
  const pathParts = path.split('/')
  const endpointPath = `/${pathParts.slice(1).join('/')}`

  const parsedOperation = OpenapiOperationSchema.parse(operation)


  const title = parsedOperation['x-title']

  const description = parsedOperation.description

  const isUndocumented = parsedOperation['x-undocumented'].length > 0

  const isDeprecated = parsedOperation.deprecated

  const deprecationMessage = parsedOperation['x-deprecated']

  const endpoint = {
    title,
    path: endpointPath,
    description,
    isUndocumented,
    isDeprecated,
    deprecationMessage,
    parameters: createParameters(operation),
    request: createRequest(method, operation),
    response: createResponse(
      'responses' in operation ? operation.responses : {},
    ),
  }

  return {
    ...endpoint,
    codeSamples: context.codeSampleDefinitions
      .filter(({ request }) => request.path === endpointPath)
      .map((codeSampleDefinition) =>
        createCodeSample(codeSampleDefinition, { endpoint }),
      ),
  }
}

const createParameters = (operation: OpenapiOperation): Parameter[] => {
  if ('parameters' in operation && Array.isArray(operation.parameters)) {
    return operation.parameters
      .filter((param) => typeof param === 'object' && param !== null)
      .map(createParameter)
  }
  return []
}

const createParameter = (param: OpenapiParameter): Parameter => {
  const parsedParam = ParameterSchema.parse(param)

  return {
    name: parsedParam.name,
    isRequired: parsedParam.required,
    isUndocumented: parsedParam['x-undocumented'].length > 0,
    isDeprecated: parsedParam.deprecated,
    deprecationMessage: parsedParam['x-deprecated'],
    description: parsedParam.description,
  }
}

const createRequest = (
  method: Method,
  operation: OpenapiOperation,
): Request => {
  const uppercaseMethod = openapiMethodToMethod(method)

  return {
    methods: [uppercaseMethod],
    semanticMethod: uppercaseMethod,
    preferredMethod: uppercaseMethod,
    parameters: createRequestBody(operation),
  }
}

const createRequestBody = (operation: OpenapiOperation): Parameter[] => {
  // This should be done by the createParameters but for some reason it's not
  // TODO: remove this in favour of using createParameters
  if (!('requestBody' in operation) || operation.requestBody === undefined) {
    return []
  }

  const requestBody = operation.requestBody

  if (
    requestBody.content?.['application/json']?.schema?.properties === undefined
  )
    return []

  const schema = requestBody.content['application/json'].schema

  if (schema.type !== 'object' || schema.properties == null) {
    return []
  }

  const requiredProperties = schema.required ?? []

  return Object.entries(schema.properties).map(
    ([name, property]: [string, any]): Parameter & {
      type: string
      format: string
    } => {
      const parsedProperty = PropertySchema.parse(property)

      return {
        name,
        type: parsedProperty.type,
        format: property.format,
        description: parsedProperty.description,
        isRequired: requiredProperties.includes(name),
        isDeprecated: parsedProperty.deprecated,
        isUndocumented: parsedProperty['x-undocumented'].length > 0,
        deprecationMessage: parsedProperty['x-deprecated'],
      }
    },
  )
}

const createResources = (
  schemas: Openapi['components']['schemas'],
  isFakeData: boolean,
  targetSchema: string,
): Record<string, Resource> => {
  return Object.entries(schemas)
    .filter(([schemaName]) => isFakeData || schemaName === targetSchema)
    .reduce<Record<string, Resource>>((acc, [schemaName, schema]) => {
      if (
        typeof schema === 'object' &&
        schema !== null &&
        'properties' in schema &&
        typeof schema.properties === 'object' &&
        schema.properties !== null
      ) {
        return {
          ...acc,
          [schemaName]: {
            resourceType: schemaName,
            properties: createProperties(schema.properties),
          },
        }
      }
      return acc
    }, {})
}

const createResponse = (responses: OpenapiOperation['responses']): Response => {
  if (responses === null) {
    return { responseType: 'void', description: '' }
  }

  const okResponse = responses['200']
  if (typeof okResponse !== 'object' || okResponse === null) {
    return { responseType: 'void', description: '' }
  }

  const content = 'content' in okResponse ? okResponse.content : null
  if (typeof content !== 'object' || content === null) {
    return {
      responseType: 'void',
      description:
        'description' in okResponse &&
        typeof okResponse.description === 'string'
          ? okResponse.description
          : '',
    }
  }

  const jsonContent =
    'application/json' in content ? content['application/json'] : null
  if (jsonContent === null) {
    return {
      responseType: 'void',
      description:
        'description' in okResponse &&
        typeof okResponse.description === 'string'
          ? okResponse.description
          : '',
    }
  }

  const schema = 'schema' in jsonContent ? jsonContent.schema : null
  if (schema === null) {
    return {
      responseType: 'void',
      description:
        'description' in okResponse &&
        typeof okResponse.description === 'string'
          ? okResponse.description
          : '',
    }
  }

  if ('type' in schema && 'properties' in schema) {
    if (
      schema.type === 'array' &&
      'items' in schema &&
      typeof schema.items === 'object' &&
      schema.items !== null
    ) {
      const refString = '$ref' in schema.items ? schema.items.$ref : null
      return {
        responseType: 'resource_list',
        responseKey: 'items',
        resourceType:
          typeof refString === 'string' && refString.length > 0
            ? refString.split('/').pop() ?? 'unknown'
            : 'unknown',
        description:
          'description' in okResponse &&
          typeof okResponse.description === 'string'
            ? okResponse.description
            : '',
      }
    } else if (
      schema.type === 'object' &&
      typeof schema.properties === 'object' &&
      schema.properties !== null
    ) {
      const properties = schema.properties
      const refKey = Object.keys(properties).find((key) => {
        const prop = properties[key]
        return (
          prop !== undefined &&
          typeof prop === 'object' &&
          prop !== null &&
          '$ref' in prop &&
          typeof prop.$ref === 'string'
        )
      })
      if (refKey != null && properties[refKey] !== undefined) {
        const refString = schema.properties[refKey]?.$ref

        return {
          responseType: 'resource',
          responseKey: refKey,
          resourceType:
            typeof refString === 'string' && refString.length > 0
              ? refString.split('/').pop() ?? 'unknown'
              : 'unknown',
          description:
            'description' in okResponse &&
            typeof okResponse.description === 'string'
              ? okResponse.description
              : '',
        }
      }
    }
  }

  return {
    responseType: 'void',
    description: okResponse.description,
  }
}

export const createProperties = (
  properties: Record<string, OpenapiSchema>,
): Property[] => {
  return Object.entries(properties).map(([name, prop]): Property => {
    const parsedProp = PropertySchema.parse(prop)

    const baseProperty = {
      name,
      description: parsedProp.description,
      isDeprecated: parsedProp['x-deprecated'].length > 0,
      deprecationMessage: parsedProp['x-deprecated'],
      isUndocumented: parsedProp['x-undocumented'].length > 0,
    }

    switch (parsedProp.type) {
      case 'string':
        if (parsedProp.enum !== undefined) {
          return {
            ...baseProperty,
            format: 'enum',
            jsonType: 'string',
            values: parsedProp.enum.map((value: any) => ({ name: value })),
          }
        }
        if (parsedProp.format === 'date-time') {
          return { ...baseProperty, format: 'datetime', jsonType: 'string' }
        }
        if (parsedProp.format === 'uuid') {
          return { ...baseProperty, format: 'id', jsonType: 'string' }
        }
        return { ...baseProperty, format: 'string', jsonType: 'string' }
      case 'boolean':
        return { ...baseProperty, format: 'boolean', jsonType: 'boolean' }
      case 'array':
        return { ...baseProperty, format: 'list', jsonType: 'array' }
      case 'object':
        if (parsedProp.properties !== undefined) {
          return {
            ...baseProperty,
            format: 'object',
            jsonType: 'object',
            properties: createProperties(
              parsedProp.properties as Record<string, OpenapiSchema>,
            ),
          }
        }
        return { ...baseProperty, format: 'record', jsonType: 'object' }
      default:
        throw new Error(`Unsupported property type: ${parsedProp.type}`)
    }
  })
}

const openapiMethodToMethod = (openapiMethod: string): Method => {
  switch (openapiMethod) {
    case 'get':
      return 'GET'
    case 'post':
      return 'POST'
    case 'put':
      return 'PUT'
    case 'delete':
      return 'DELETE'
    case 'patch':
      return 'PATCH'
    default:
      return 'POST'
  }
}
