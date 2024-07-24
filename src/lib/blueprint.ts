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

interface StringProperty extends BaseProperty {
  type: 'string'
}

interface EnumProperty extends BaseProperty {
  type: 'enum'
  values: EnumValue[]
}

interface EnumValue {
  name: string
}

interface RecordProperty extends BaseProperty {
  type: 'record'
}

interface ListProperty extends BaseProperty {
  type: 'list'
}

interface BooleanProperty extends BaseProperty {
  type: 'boolean'
}

interface ObjectProperty extends BaseProperty {
  type: 'object'
  properties: Property[]
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

  const description =
    'description' in operation && typeof operation.description === 'string'
      ? operation.description
      : ''

  const isUndocumented =
    'x-undocumented' in operation && operation['x-undocumented'] !== undefined
      ? Boolean(operation['x-undocumented'])
      : false

  const isDeprecated =
    'deprecated' in operation && operation.deprecated === true

  const deprecationMessage =
    'x-deprecated' in operation && typeof operation['x-deprecated'] === 'string'
      ? operation['x-deprecated']
      : ''

  const endpoint = {
    title:
      'operationId' in operation && typeof operation.operationId === 'string'
        ? operation.operationId
        : `${path.replace(/\//g, '')}${method.charAt(0).toUpperCase()}${method.slice(1).toLowerCase()}`,
    path: endpointPath,
    description,
    isUndocumented,
    isDeprecated,
    deprecationMessage,
    codeSamples: context.codeSamples.filter(
      ({ request }) => request.path === endpointPath,
    ),
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
  return {
    name: 'name' in param && typeof param.name === 'string' ? param.name : '',
    isRequired:
      'required' in param && typeof param.required === 'boolean'
        ? param.required
        : false,
    isUndocumented: false,
    isDeprecated: false,
    deprecationMessage: '',
    description:
      'description' in param && typeof param.description === 'string'
        ? param.description
        : '',
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
    parameters: createParameters(operation),
  }
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

const createProperties = (
  properties: Record<string, OpenapiSchema>,
): Property[] => {
  return Object.entries(properties).map(([name, prop]): Property => {
    if (prop === null) {
      return {
        name,
        type: 'string',
        isDeprecated: false,
        deprecationMessage: '',
        isUndocumented: false,
      }
    }

    const description =
      'description' in prop && typeof prop.description === 'string'
        ? prop.description
        : ''

    const isUndocumented =
      'x-undocumented' in prop ? Boolean(prop['x-undocumented']) : false
    const isDeprecated = 'deprecated' in prop && prop.deprecated === true

    const deprecationMessage =
      'x-deprecated' in prop && typeof prop['x-deprecated'] === 'string'
        ? prop['x-deprecated']
        : ''

    const baseProperty = {
      name,
      description,
      isDeprecated,
      deprecationMessage,
      isUndocumented,
    }

    if ('type' in prop) {
      switch (prop.type) {
        case 'string':
          if ('enum' in prop && Array.isArray(prop.enum)) {
            return {
              ...baseProperty,
              type: 'enum',
              values: prop.enum.map((value) => ({ name: String(value) })),
            }
          }
          return { ...baseProperty, type: 'string' }
        case 'object':
          return {
            ...baseProperty,
            type: 'object',
            properties:
              'properties' in prop &&
              typeof prop.properties === 'object' &&
              prop.properties !== null
                ? createProperties(prop.properties)
                : [],
          }
        case 'array':
          return { ...baseProperty, type: 'list' }
        case 'boolean':
          return { ...baseProperty, type: 'boolean' }
        default:
          return { ...baseProperty, type: 'string' }
      }
    }
    return { ...baseProperty, type: 'string' }
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
