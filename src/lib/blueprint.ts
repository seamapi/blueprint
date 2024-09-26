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
  isUndocumented: boolean
  isDeprecated: boolean
}

export interface Resource {
  resourceType: string
  properties: Property[]
  description: string
}

export interface Namespace {
  path: string
  isDeprecated: boolean
  isUndocumented: boolean
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
  | NumberProperty
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

interface NumberProperty extends BaseProperty {
  format: 'number'
  jsonType: 'number'
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
  console.log('🚀 ~ openapi:', Object.keys(openapi.paths))

  const isFakeData = openapi.info.title === 'Foo'
  const targetPaths = ['/acs', '/events', '/thermostats']
  const targetSchemas = [
    'acs_access_group',
    'acs_credential',
    'acs_credential_pool',
    'acs_credential_provisioning_automation',
    'acs_entrance',
    'acs_system',
    'acs_user',
    'event',
    'climate_preset',
    'thermostat_schedule',
  ]

  const context = {
    codeSampleDefinitions,
    formatCode,
  }

  return {
    title: openapi.info.title,
    routes: await createRoutes(openapi.paths, isFakeData, targetPaths, context),
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
  targetPaths: string[],
  context: Context,
): Promise<Route[]> => {
  const routeMap = new Map<string, Route>()

  for (const targetPath of targetPaths) {
    const pathEntries = Object.entries(paths).filter(
      ([path]) => isFakeData || path.startsWith(targetPath),
    )

    for (const [path, pathItem] of pathEntries) {
      const namespace = getNamespace(path, paths)

      const route = await createRoute(namespace, path, pathItem, context)

      const existingRoute = routeMap.get(route.path)
      if (existingRoute != null) {
        existingRoute.endpoints.push(...route.endpoints)
        continue
      }

      routeMap.set(route.path, route)
    }
  }

  const routes = Array.from(routeMap.values())

  return routes
    .map(addIsDeprecatedToRoute)
    .map(addIsUndocumentedToRoute)
    .map(addNamespaceStatusToRoute)
}

const getNamespace = (path: string, paths: OpenapiPaths): string | null => {
  // Hold namespace in array to allow nested namespaces
  // e.g. namespace for `/foo/bar/baz/get` = `/foo/bar`
  const namespace: string[] = []

  const pathParts = path.split('/').filter((path) => Boolean(path))

  const pathKeys = Object.keys(paths)

  for (const [index, part] of pathParts.entries()) {
    // Namespaces must be consecutive. If there was a path with an endpoint
    // previously, then this part is not in the namespace.
    if (namespace.length !== index) {
      continue
    }

    // An endpoint is a route that ends without further paths. i.e., ends in
    // a letter (not slash).
    const endpoints = pathKeys.filter((key) => {
      return new RegExp(`^/${[...namespace, part].join('/')}/\\w+$`).test(key)
    })

    if (endpoints.length === 0) {
      namespace.push(part)
    }
  }

  if (namespace.length === 0) {
    return null
  }

  return `/${namespace.join('/')}`
}

const createRoute = async (
  namespace: string | null,
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
    namespace:
      namespace != null
        ? {
            path: namespace,
            isDeprecated: false,
            isUndocumented: false,
          }
        : null,
    endpoints: await createEndpoints(path, pathItem, context),
    subroutes: [],
    isUndocumented: false,
    isDeprecated: false,
  }
}

const addIsDeprecatedToRoute = (route: Route): Route => ({
  ...route,
  isDeprecated: route.endpoints.every((endpoint) => endpoint.isDeprecated),
})

const addIsUndocumentedToRoute = (route: Route): Route => ({
  ...route,
  isUndocumented: route.endpoints.every((endpoint) => endpoint.isUndocumented),
})

const addNamespaceStatusToRoute = (
  route: Route,
  _idx: number,
  routes: Route[],
): Route => {
  if (route.namespace == null) return route

  const namespaceRoutes = routes.filter(
    (r) => r.namespace?.path === route.namespace?.path,
  )
  const isNamespaceDeprecated = namespaceRoutes.every((r) => r.isDeprecated)
  const isNamespaceUndocumented = namespaceRoutes.every((r) => r.isUndocumented)

  return {
    ...route,
    namespace: {
      ...route.namespace,
      isDeprecated: isNamespaceDeprecated,
      isUndocumented: isNamespaceUndocumented,
    },
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

  const parsedOperation = OpenapiOperationSchema.parse(operation, {
    path: pathParts,
  })

  const title = parsedOperation['x-title']

  const description = parsedOperation.description

  const isUndocumented = parsedOperation['x-undocumented'].length > 0

  const isDeprecated = parsedOperation.deprecated

  const deprecationMessage = parsedOperation['x-deprecated']

  const request = createRequest(methods, operation, path)

  const endpoint: Omit<Endpoint, 'codeSamples'> = {
    title,
    name,
    path: endpointPath,
    description,
    isUndocumented,
    isDeprecated,
    deprecationMessage,
    response: createResponse(operation, path),
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
  path: string,
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
    parameters: createRequestBody(operation, path),
  }
}

const createRequestBody = (
  operation: OpenapiOperation,
  path: string,
): Parameter[] => {
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

  return createParameters(schema.properties, path, schema.required)
}

const createParameters = (
  properties: Record<string, OpenapiSchema>,
  path: string,
  requiredParameters: string[] = [],
): Parameter[] => {
  return Object.entries(properties)
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
    .map(
      ([name, property]: [string, any]): Parameter =>
        createParameter(name, property, path, requiredParameters),
    )
}

const createParameter = (
  name: string,
  property: any,
  path: string,
  requiredParameters: string[],
): Parameter => {
  const parsedProp = PropertySchema.parse(property, {
    path: [...path.split('/'), name],
  })

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
            path,
          ),
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
            properties: createProperties(schema.properties, [schemaName]),
            description: schema.description ?? '',
          },
        }
      }
      return acc
    }, {})
}

const createResponse = (
  operation: OpenapiOperation,
  path: string,
): Response => {
  if (!('responses' in operation) || operation.responses == null) {
    throw new Error(
      `Missing responses in operation for ${operation.operationId}`,
    )
  }

  const parsedOperation = OpenapiOperationSchema.parse(operation, {
    path: [...path.split('/')],
  })
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
  parentPaths: string[],
): Property[] => {
  return Object.entries(properties)
    .filter(([name, property]) => {
      if (property.type == null) {
        // eslint-disable-next-line no-console
        console.warn(
          `The ${name} property for ${parentPaths.join('.')} will not be documented since it does not define a type.`,
        )
        return false
      }
      return true
    })
    .map(([name, prop]) => createProperty(name, prop, [...parentPaths]))
}

const createProperty = (
  name: string,
  prop: OpenapiSchema,
  parentPaths: string[],
): Property => {
  const parsedProp = PropertySchema.parse(prop, {
    path: [...parentPaths, name],
  })

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
          properties: createProperties(prop.properties, [...parentPaths, name]),
        }
      }
      return { ...baseProperty, format: 'record', jsonType: 'object' }
    case 'number':
    case 'integer':
      return {
        ...baseProperty,
        format: 'number',
        jsonType: 'number',
      }
    default:
      throw new Error(`Unsupported property type: ${parsedProp.type}`)
  }
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
