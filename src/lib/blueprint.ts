import { z } from 'zod'

import {
  type CodeSample,
  CodeSampleDefinitionSchema,
  createCodeSample,
} from './code-sample/index.js'
import type {
  CodeSampleDefinition,
  CodeSampleSyntax,
} from './code-sample/schema.js'
import type {
  Openapi,
  OpenapiOperation,
  OpenapiPathItem,
  OpenapiPaths,
  OpenapiSchema,
} from './openapi.js'
import { OpenapiOperationSchema, PropertySchema } from './openapi-schema.js'

export interface Blueprint {
  title: string
  routes: Route[]
  resources: Record<string, Resource>
}

export interface Route {
  path: string
  name: string
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[]
}

export interface Resource {
  resourceType: string
  properties: Property[]
  description: string
}

export interface Namespace {
  path: string
}

export interface Endpoint {
  title: string
  path: string
  name: string
  description: string
  isUndocumented: boolean
  isDeprecated: boolean
  deprecationMessage: string
  request: Request
  response: Response
  codeSamples: CodeSample[]
}

interface BaseParameter {
  name: string
  isRequired: boolean
  isUndocumented: boolean
  isDeprecated: boolean
  deprecationMessage: string
  description: string
}

interface StringParameter extends BaseParameter {
  format: 'string'
  jsonType: 'string'
}

interface NumberParameter extends BaseParameter {
  format: 'number'
  jsonType: 'number'
}

interface EnumParameter extends BaseParameter {
  format: 'enum'
  jsonType: 'string'
  values: EnumValue[]
}

interface RecordParameter extends BaseParameter {
  format: 'record'
  jsonType: 'object'
}

interface ListParameter extends BaseParameter {
  format: 'list'
  jsonType: 'array'
}

interface BooleanParameter extends BaseParameter {
  format: 'boolean'
  jsonType: 'boolean'
}

interface ObjectParameter extends BaseParameter {
  format: 'object'
  jsonType: 'object'
  parameters: Parameter[]
}

interface DatetimeParameter extends BaseParameter {
  format: 'datetime'
  jsonType: 'string'
}

interface IdParameter extends BaseParameter {
  format: 'id'
  jsonType: 'string'
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
  description: string
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

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface Context extends Required<BlueprintOptions> {
  codeSampleDefinitions: CodeSampleDefinition[]
}

export const TypesModuleSchema = z.object({
  codeSampleDefinitions: z.array(CodeSampleDefinitionSchema).default([]),
  // TODO: Import and use openapi zod schema here
  openapi: z.any(),
})

export type TypesModuleInput = z.input<typeof TypesModuleSchema>

export type TypesModule = z.output<typeof TypesModuleSchema>

export interface BlueprintOptions {
  formatCode?: (content: string, syntax: CodeSampleSyntax) => Promise<string>
}

export const createBlueprint = async (
  typesModule: TypesModuleInput,
  { formatCode = async (content) => content }: BlueprintOptions = {},
): Promise<Blueprint> => {
  const { codeSampleDefinitions } = TypesModuleSchema.parse(typesModule)

  // TODO: Move openapi to TypesModuleSchema
  const openapi = typesModule.openapi as Openapi

  const isFakeData = openapi.info.title === 'Foo'
  const targetPath = '/acs'
  const targetSchemas = [
    'acs_access_group',
    'acs_credential',
    'acs_credential_pool',
    'acs_credential_provisioning_automation',
    'acs_entrance',
    'acs_system',
    'acs_user',
  ]

  const context = {
    codeSampleDefinitions,
    formatCode,
  }

  return {
    title: openapi.info.title,
    routes: await createRoutes(openapi.paths, isFakeData, targetPath, context),
    resources: createResources(
      openapi.components.schemas,
      isFakeData,
      targetSchemas,
    ),
  }
}

const createRoutes = async (
  paths: OpenapiPaths,
  isFakeData: boolean,
  targetPath: string,
  context: Context,
): Promise<Route[]> => {
  const routeMap = new Map<string, Route>()

  const pathEntries = Object.entries(paths).filter(
    ([path]) => isFakeData || path.startsWith(targetPath),
  )

  for (const [path, pathItem] of pathEntries) {
    const route = await createRoute(path, pathItem, context)

    const existingRoute = routeMap.get(route.path)
    if (existingRoute != null) {
      existingRoute.endpoints.push(...route.endpoints)
      continue
    }

    routeMap.set(route.path, route)
  }

  return Array.from(routeMap.values())
}

const createRoute = async (
  path: string,
  pathItem: OpenapiPathItem,
  context: Context,
): Promise<Route> => {
  const pathParts = path.split('/')
  const routePath = `/${pathParts.slice(1, -1).join('/')}`
  const name = pathParts.at(-2)
  if (name == null) {
    throw new Error(`Could not resolve name for route at ${path}`)
  }

  return {
    path: routePath,
    name,
    namespace: { path: `/${pathParts[1]}` },
    endpoints: await createEndpoints(path, pathItem, context),
    subroutes: [],
  }
}

const createEndpoints = async (
  path: string,
  pathItem: OpenapiPathItem,
  context: Context,
): Promise<Endpoint[]> => {
  const validMethods: Method[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

  return await Promise.all(
    Object.entries(pathItem)
      .filter(
        ([method, operation]) =>
          validMethods.includes(method.toUpperCase() as Method) &&
          typeof operation === 'object' &&
          operation !== null,
      )
      .map(async ([method, operation]) => {
        const uppercaseMethod = method.toUpperCase() as Method
        return await createEndpoint(
          [uppercaseMethod],
          operation as OpenapiOperation,
          path,
          context,
        )
      }),
  )
}

const createEndpoint = async (
  methods: Method[],
  operation: OpenapiOperation,
  path: string,
  context: Context,
): Promise<Endpoint> => {
  const pathParts = path.split('/')
  const endpointPath = `/${pathParts.slice(1).join('/')}`

  const name = pathParts.at(-1)
  if (name == null) {
    throw new Error(`Could not resolve name for endpoint at ${path}`)
  }

  const parsedOperation = OpenapiOperationSchema.parse(operation)

  const title = parsedOperation['x-title']

  const description = parsedOperation.description

  const isUndocumented = parsedOperation['x-undocumented'].length > 0

  const isDeprecated = parsedOperation.deprecated

  const deprecationMessage = parsedOperation['x-deprecated']

  const request = createRequest(methods, operation)

  const endpoint: Omit<Endpoint, 'codeSamples'> = {
    title,
    name,
    path: endpointPath,
    description,
    isUndocumented,
    isDeprecated,
    deprecationMessage,
    response: createResponse(operation),
    request,
  }

  return {
    ...endpoint,
    codeSamples: await Promise.all(
      context.codeSampleDefinitions
        .filter(({ request }) => request.path === endpointPath)
        .map(
          async (codeSampleDefinition) =>
            await createCodeSample(codeSampleDefinition, {
              endpoint,
              formatCode: context.formatCode,
            }),
        ),
    ),
  }
}

export const createRequest = (
  methods: Method[],
  operation: OpenapiOperation,
): Request => {
  if (methods.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('At least one HTTP method should be specified')
  }

  if (methods.length > 2) {
    // eslint-disable-next-line no-console
    console.warn('More than two methods detected. Was this intended?')
  }

  if (!methods.includes('POST')) {
    // eslint-disable-next-line no-console
    console.warn('POST method is missing')
  }

  const semanticMethod = getSemanticMethod(methods)
  const preferredMethod = getPreferredMethod(methods, semanticMethod, operation)

  return {
    methods,
    semanticMethod,
    preferredMethod,
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

  return createParameters(schema.properties, schema.required)
}

const createParameters = (
  properties: Record<string, OpenapiSchema>,
  requiredParameters: string[] = [],
): Parameter[] => {
  return Object.entries(properties).map(
    ([name, property]: [string, any]): Parameter => {
      const parsedProp = PropertySchema.parse(property)

      const baseParam: BaseParameter = {
        name,
        description: parsedProp.description,
        isRequired: requiredParameters.includes(name),
        isDeprecated: parsedProp['x-deprecated'].length > 0,
        deprecationMessage: parsedProp['x-deprecated'],
        isUndocumented: parsedProp['x-undocumented'].length > 0,
      }

      switch (parsedProp.type) {
        case 'string':
          if (parsedProp.enum !== undefined) {
            return {
              ...baseParam,
              format: 'enum',
              jsonType: 'string',
              values: parsedProp.enum.map((value: any) => ({
                name: value,
              })),
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
        case 'array':
          return { ...baseParam, format: 'list', jsonType: 'array' }
        case 'object':
          if (property.properties !== undefined) {
            return {
              ...baseParam,
              format: 'object',
              jsonType: 'object',
              parameters: createParameters(
                property.properties as Record<string, OpenapiSchema>,
              ),
            }
          }
          return { ...baseParam, format: 'record', jsonType: 'object' }
        case 'number':
          return {
            ...baseParam,
            format: 'number',
            jsonType: 'number',
          }
        default:
          throw new Error(`Unsupported property type: ${parsedProp.type}`)
      }
    },
  )
}

const createResources = (
  schemas: Openapi['components']['schemas'],
  isFakeData: boolean,
  targetSchemas: string[],
): Record<string, Resource> => {
  return Object.entries(schemas)
    .filter(([schemaName]) => isFakeData || targetSchemas.includes(schemaName))
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
            description: schema.description ?? '',
          },
        }
      }
      return acc
    }, {})
}

const createResponse = (operation: OpenapiOperation): Response => {
  if (!('responses' in operation) || operation.responses == null) {
    throw new Error(
      `Missing responses in operation for ${operation.operationId}`,
    )
  }

  const parsedOperation = OpenapiOperationSchema.parse(operation)
  const { responses } = operation

  const okResponse = responses['200']

  if (typeof okResponse !== 'object' || okResponse == null) {
    return { responseType: 'void', description: 'Unknown' }
  }

  const description = okResponse.description ?? ''
  const responseKey = parsedOperation['x-response-key']

  if (responseKey == null) {
    return {
      responseType: 'void',
      description,
    }
  }

  const content = 'content' in okResponse ? okResponse.content : null
  if (typeof content !== 'object' || content === null) {
    return {
      responseType: 'void',
      description,
    }
  }

  const jsonContent =
    'application/json' in content ? content['application/json'] : null
  if (jsonContent === null) {
    return {
      responseType: 'void',
      description,
    }
  }

  const schema = 'schema' in jsonContent ? jsonContent.schema : null
  if (schema === null) {
    return {
      responseType: 'void',
      description,
    }
  }

  if (
    'type' in schema &&
    'properties' in schema &&
    schema.type === 'object' &&
    typeof schema.properties === 'object' &&
    schema.properties !== null
  ) {
    const properties = schema.properties

    const refKey = responseKey

    if (refKey != null && properties[refKey] != null) {
      const props = schema.properties[refKey]
      const refString = props?.$ref ?? props?.items?.$ref

      return {
        responseType: props?.type === 'array' ? 'resource_list' : 'resource',
        responseKey: refKey,
        resourceType: refString?.split('/').at(-1) ?? 'unknown',
        description,
      }
    }
  }

  return {
    responseType: 'void',
    description: 'Unknown',
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
        if (prop.properties !== undefined) {
          return {
            ...baseProperty,
            format: 'object',
            jsonType: 'object',
            properties: createProperties(prop.properties),
          }
        }
        return { ...baseProperty, format: 'record', jsonType: 'object' }
      default:
        throw new Error(`Unsupported property type: ${parsedProp.type}`)
    }
  })
}

export const getSemanticMethod = (methods: Method[]): Method => {
  if (methods.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return methods[0]!
  }

  const priorityOrder: Method[] = ['PUT', 'PATCH', 'POST', 'GET', 'DELETE']
  return methods.find((m) => priorityOrder.includes(m)) ?? 'POST'
}

export const getPreferredMethod = (
  methods: Method[],
  semanticMethod: Method,
  operation: OpenapiOperation,
): Method => {
  if (methods.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return methods[0]!
  }

  if (methods.includes('POST')) {
    if (semanticMethod === 'GET' || semanticMethod === 'DELETE') {
      const hasComplexParameters =
        (operation.parameters?.some(
          (param) =>
            param.schema?.type === 'array' || param.schema?.type === 'object',
        ) ??
          false) ||
        operation.requestBody?.content?.['application/json']?.schema?.type ===
          'object'

      if (hasComplexParameters) {
        return 'POST'
      }
    }
  }

  return semanticMethod
}
