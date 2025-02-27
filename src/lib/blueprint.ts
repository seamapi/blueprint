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
import { findCommonOpenapiSchemaProperties } from './openapi/find-common-openapi-schema-properties.js'
import { flattenOpenapiSchema } from './openapi/flatten-openapi-schema.js'
import {
  type AuthMethodSchema,
  EventResourceSchema,
  OpenapiOperationSchema,
  PropertySchema,
  ResourceSchema,
} from './openapi/schemas.js'
import type {
  Openapi,
  OpenapiOperation,
  OpenapiPathItem,
  OpenapiPaths,
  OpenapiSchema,
} from './openapi/types.js'

export interface Blueprint {
  title: string
  routes: Route[]
  resources: Record<string, Resource>
  events: EventResource[]
  actionAttempts: ActionAttempt[]
}

export interface Route {
  path: string
  name: string
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[]
  isUndocumented: boolean
  isDeprecated: boolean
  isDraft: boolean
}

export interface Resource {
  resourceType: string
  properties: Property[]
  description: string
  routePath: string
  isDeprecated: boolean
  deprecationMessage: string
  isUndocumented: boolean
  undocumentedMessage: string
  isDraft: boolean
  draftMessage: string
}

interface EventResource extends Resource {
  resourceType: 'event'
  eventType: string
  targetResourceType: string | null
}

export interface ActionAttempt extends Resource {
  resourceType: 'action_attempt'
  actionAttemptType: string
}

export interface Namespace {
  path: string
  isDeprecated: boolean
  isUndocumented: boolean
  isDraft: boolean
}

export interface Endpoint {
  title: string
  path: string
  name: string
  description: string
  isDeprecated: boolean
  deprecationMessage: string
  isUndocumented: boolean
  undocumentedMessage: string
  isDraft: boolean
  draftMessage: string
  request: Request
  response: Response
  codeSamples: CodeSample[]
  authMethods: SeamAuthMethod[]
  workspaceScope: SeamWorkspaceScope
}

export type SeamAuthMethod =
  | 'api_key'
  | 'personal_access_token'
  | 'console_session_token'
  | 'client_session_token'
  | 'publishable_key'

export type SeamWorkspaceScope = 'none' | 'optional' | 'required'

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
  actionAttemptType?: string
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
  undocumentedMessage: string
  isDraft: boolean
  draftMessage: string
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

type EnumValue = BaseProperty

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
  validActionAttemptTypes: string[]
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

  const validActionAttemptTypes = extractValidActionAttemptTypes(
    openapi.components.schemas,
  )

  const context: Context = {
    codeSampleDefinitions,
    formatCode,
    validActionAttemptTypes,
  }

  const routes = await createRoutes(openapi.paths, context)
  const resources = createResources(openapi.components.schemas, routes)
  const actionAttempts = createActionAttempts(
    openapi.components.schemas,
    routes,
  )

  return {
    title: openapi.info.title,
    routes,
    resources,
    events: createEvents(openapi.components.schemas, resources, routes),
    actionAttempts,
  }
}

const extractValidActionAttemptTypes = (
  schemas: Openapi['components']['schemas'],
): string[] => {
  const actionAttemptSchema = schemas['action_attempt']
  if (
    actionAttemptSchema == null ||
    typeof actionAttemptSchema !== 'object' ||
    !('oneOf' in actionAttemptSchema) ||
    !Array.isArray(actionAttemptSchema.oneOf)
  ) {
    return []
  }

  const processedActionAttemptTypes = new Set<string>()
  actionAttemptSchema.oneOf.forEach((schema) => {
    const actionType = schema.properties?.['action_type']?.enum?.[0]
    if (typeof actionType === 'string') {
      processedActionAttemptTypes.add(actionType)
    }
  })

  return Array.from(processedActionAttemptTypes)
}

const createRoutes = async (
  paths: OpenapiPaths,
  context: Context,
): Promise<Route[]> => {
  const routeMap = new Map<string, Route>()

  const pathEntries = Object.entries(paths)

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

  const routes = Array.from(routeMap.values())

  return routes
    .map(addIsDeprecatedToRoute)
    .map(addIsUndocumentedToRoute)
    .map(addIsDraftToRoute)
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

  const endpoint = await createEndpoint(path, pathItem, context)

  return {
    path: routePath,
    name,
    namespace:
      namespace != null
        ? {
            path: namespace,
            isDeprecated: false,
            isUndocumented: false,
            isDraft: false,
          }
        : null,
    endpoints: endpoint != null ? [endpoint] : [],
    subroutes: [],
    isUndocumented: false,
    isDeprecated: false,
    isDraft: false,
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

const addIsDraftToRoute = (route: Route): Route => ({
  ...route,
  isDraft: route.endpoints.every((endpoint) => endpoint.isDraft),
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
  const isNamespaceDraft = namespaceRoutes.every((r) => r.isDraft)

  return {
    ...route,
    namespace: {
      ...route.namespace,
      isDeprecated: isNamespaceDeprecated,
      isUndocumented: isNamespaceUndocumented,
      isDraft: isNamespaceDraft,
    },
  }
}

const createEndpoint = async (
  path: string,
  pathItem: OpenapiPathItem,
  context: Context,
): Promise<Endpoint | null> => {
  const validMethods: Method[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  const validOperations = Object.entries(pathItem).filter(
    ([method, operation]) =>
      validMethods.includes(method.toUpperCase() as Method) &&
      typeof operation === 'object' &&
      operation !== null,
  )
  const supportedMethods = validOperations.map(
    ([method]) => method.toUpperCase() as Method,
  )

  const validOperation = validOperations[0]
  if (validOperation == null) {
    // eslint-disable-next-line no-console
    console.warn(`No valid operations found for ${path}`)

    return null
  }

  const [_, operation] = validOperation

  return await createEndpointFromOperation(
    supportedMethods,
    operation as OpenapiOperation,
    path,
    context,
  )
}

const createEndpointFromOperation = async (
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
  const undocumentedMessage = parsedOperation['x-undocumented']

  const isDeprecated = parsedOperation.deprecated
  const deprecationMessage = parsedOperation['x-deprecated']

  const isDraft = parsedOperation['x-draft'].length > 0
  const draftMessage = parsedOperation['x-draft']

  const request = createRequest(methods, operation, path)
  const response = createResponse(operation, path, context)

  const operationAuthMethods = parsedOperation.security.map(
    (securitySchema) => {
      const [authMethod = ''] = Object.keys(securitySchema)
      return authMethod as OpenapiAuthMethod
    },
  )
  const endpointAuthMethods = operationAuthMethods
    .map(mapOpenapiToSeamAuthMethod)
    .filter((authMethod): authMethod is SeamAuthMethod => authMethod != null)
  const workspaceScope = getWorkspaceScope(operationAuthMethods)

  const endpoint: Omit<Endpoint, 'codeSamples'> = {
    title,
    name,
    path: endpointPath,
    description,
    isDeprecated,
    deprecationMessage,
    isUndocumented,
    undocumentedMessage,
    isDraft,
    draftMessage,
    response,
    request,
    authMethods: endpointAuthMethods,
    workspaceScope,
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

export type OpenapiAuthMethod = z.infer<typeof AuthMethodSchema>

export const getWorkspaceScope = (
  authMethods: OpenapiAuthMethod[],
): SeamWorkspaceScope => {
  const hasWorkspaceUnscoped = authMethods.some((method) =>
    method.endsWith('_without_workspace'),
  )

  const workspaceScopedAuthMethods: OpenapiAuthMethod[] = [
    'api_key',
    'client_session',
    'console_session_token_with_workspace',
    'pat_with_workspace',
    'publishable_key',
  ]
  const hasWorkspaceScoped = authMethods.some((method) =>
    workspaceScopedAuthMethods.includes(method),
  )

  const hasNoAuthMethods = !hasWorkspaceUnscoped && !hasWorkspaceScoped
  if (hasNoAuthMethods) return 'none'

  const hasOnlyUnscopedAuth = hasWorkspaceUnscoped && !hasWorkspaceScoped
  if (hasOnlyUnscopedAuth) return 'none'

  const hasBothScopedAndUnscoped = hasWorkspaceUnscoped && hasWorkspaceScoped
  if (hasBothScopedAndUnscoped) return 'optional'

  const hasOnlyScopedAuth = !hasWorkspaceUnscoped && hasWorkspaceScoped
  if (hasOnlyScopedAuth) return 'required'

  return 'none'
}

type KnownOpenapiAuthMethod = Exclude<OpenapiAuthMethod, 'unknown'>

const mapOpenapiToSeamAuthMethod = (
  method: string,
): SeamAuthMethod | undefined => {
  const AUTH_METHOD_MAPPING: Record<KnownOpenapiAuthMethod, SeamAuthMethod> = {
    api_key: 'api_key',
    pat_with_workspace: 'personal_access_token',
    pat_without_workspace: 'personal_access_token',
    console_session_token_with_workspace: 'console_session_token',
    console_session_token_without_workspace: 'console_session_token',
    client_session: 'client_session_token',
    publishable_key: 'publishable_key',
  } as const

  return AUTH_METHOD_MAPPING[method as KnownOpenapiAuthMethod]
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
    console.warn(`POST method is missing for ${path}`)
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
    undocumentedMessage: parsedProp['x-undocumented'],
    isDraft: parsedProp['x-draft'].length > 0,
    draftMessage: parsedProp['x-draft'],
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
              description: enumValue?.description ?? '',
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

export const createResources = (
  schemas: Openapi['components']['schemas'],
  routes: Route[],
): Record<string, Resource> => {
  return Object.entries(schemas).reduce<Record<string, Resource>>(
    (resources, [schemaName, schema]) => {
      const { success: isValidEventSchema, data: parsedEvent } =
        EventResourceSchema.safeParse(schema)
      if (isValidEventSchema) {
        const commonProperties = findCommonOpenapiSchemaProperties(
          parsedEvent.oneOf,
        )
        const eventSchema: OpenapiSchema = {
          'x-route-path': parsedEvent['x-route-path'],
          properties: commonProperties,
          type: 'object',
        }
        return {
          ...resources,
          [schemaName]: createResource(schemaName, eventSchema, routes),
        }
      }

      const { success: isValidResourceSchema } =
        ResourceSchema.safeParse(schema)
      if (isValidResourceSchema) {
        return {
          ...resources,
          [schemaName]: createResource(schemaName, schema, routes),
        }
      }

      return resources
    },
    {},
  )
}

const createResource = (
  schemaName: string,
  schema: OpenapiSchema,
  routes: Route[],
): Resource => {
  const routePath = validateRoutePath(
    schemaName,
    schema['x-route-path'],
    routes,
  )

  return {
    resourceType: schemaName,
    properties: createProperties(schema.properties ?? {}, [schemaName]),
    description: schema.description ?? '',
    isDeprecated: schema.deprecated ?? false,
    routePath,
    deprecationMessage: schema['x-deprecated'] ?? '',
    isUndocumented: (schema['x-undocumented'] ?? '').length > 0,
    undocumentedMessage: schema['x-undocumented'] ?? '',
    isDraft: (schema['x-draft'] ?? '').length > 0,
    draftMessage: schema['x-draft'] ?? '',
  }
}

const validateRoutePath = (
  resourceName: string,
  routePath: string | undefined,
  routes: Route[],
): string => {
  if (routePath == null || routePath.length === 0) {
    throw new Error(`Resource ${resourceName} is missing a route path`)
  }
  if (!routes.some((r) => r.path === routePath)) {
    throw new Error(`Route path ${routePath} not found in routes`)
  }

  return routePath
}

const createResponse = (
  operation: OpenapiOperation,
  path: string,
  context: Context,
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

  if (!('x-response-key' in parsedOperation)) {
    throw new Error(`Missing responseKey for ${path}`)
  }

  const responseKey = parsedOperation['x-response-key']

  if (responseKey === null) {
    return {
      responseType: 'void',
      description,
    }
  }

  if (responseKey == null) {
    throw new Error(`Missing responseKey for ${path}`)
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

    if (!(responseKey in properties)) {
      throw new Error(
        `Response key '${responseKey}' not found in response schema for ${path}`,
      )
    }

    const actionAttemptType = validateActionAttemptType(
      parsedOperation['x-action-attempt-type'],
      responseKey,
      path,
      context.validActionAttemptTypes,
    )
    const refKey = responseKey

    if (refKey != null && properties[refKey] != null) {
      const props = schema.properties[refKey]
      const refString = props?.$ref ?? props?.items?.$ref

      return {
        responseType: props?.type === 'array' ? 'resource_list' : 'resource',
        responseKey: refKey,
        resourceType: refString?.split('/').at(-1) ?? 'unknown',
        description,
        ...(actionAttemptType != null && { actionAttemptType }),
      }
    }
  }

  return {
    responseType: 'void',
    description: 'Unknown',
  }
}

const validateActionAttemptType = (
  actionAttemptType: string | undefined,
  responseKey: string,
  path: string,
  validActionAttemptTypes: string[],
): string | undefined => {
  const excludedPaths = ['/action_attempts']
  const isPathExcluded = excludedPaths.some((p) => path.startsWith(p))

  if (
    actionAttemptType == null &&
    responseKey === 'action_attempt' &&
    !isPathExcluded
  ) {
    throw new Error(`Missing action_attempt_type for path ${path}`)
  }

  if (
    actionAttemptType != null &&
    !validActionAttemptTypes.includes(actionAttemptType)
  ) {
    throw new Error(
      `Invalid action_attempt_type '${actionAttemptType}' for path ${path}`,
    )
  }

  return actionAttemptType
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
    undocumentedMessage: parsedProp['x-undocumented'],
    isDraft: parsedProp['x-draft'].length > 0,
    draftMessage: parsedProp['x-draft'],
  }

  switch (parsedProp.type) {
    case 'string':
      if (parsedProp.enum !== undefined) {
        return {
          ...baseProperty,
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
              description: enumValue?.description ?? '',
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

  const priorityOrder: Method[] = ['PUT', 'PATCH', 'GET', 'DELETE', 'POST']

  for (const method of priorityOrder) {
    if (methods.includes(method)) {
      return method
    }
  }

  return 'POST'
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

const createEvents = (
  schemas: Openapi['components']['schemas'],
  resources: Record<string, Resource>,
  routes: Route[],
): EventResource[] => {
  const eventSchema = schemas['event']
  if (
    eventSchema == null ||
    typeof eventSchema !== 'object' ||
    !('oneOf' in eventSchema) ||
    !Array.isArray(eventSchema.oneOf)
  ) {
    return []
  }

  return eventSchema.oneOf
    .map((schema) => {
      if (
        typeof schema !== 'object' ||
        schema.properties?.['event_type']?.enum?.[0] == null
      ) {
        return null
      }

      const eventType = schema.properties['event_type'].enum[0]
      const targetResourceType = Object.keys(resources).find((resourceName) =>
        eventType.split('.').includes(resourceName),
      )

      return {
        ...createResource('event', schema, routes),
        eventType,
        targetResourceType: targetResourceType ?? null,
      }
    })
    .filter((event): event is EventResource => event !== null)
}

const createActionAttempts = (
  schemas: Openapi['components']['schemas'],
  routes: Route[],
): ActionAttempt[] => {
  const actionAttemptSchema = schemas['action_attempt']
  if (
    actionAttemptSchema == null ||
    typeof actionAttemptSchema !== 'object' ||
    !('oneOf' in actionAttemptSchema) ||
    !Array.isArray(actionAttemptSchema.oneOf)
  ) {
    return []
  }

  const schemasByActionType: Record<string, OpenapiSchema[]> = {}

  for (const schema of actionAttemptSchema.oneOf) {
    if (
      typeof schema !== 'object' ||
      schema.properties?.['action_type']?.enum?.[0] == null
    ) {
      continue
    }

    const actionType = schema.properties['action_type'].enum[0]
    if (schemasByActionType[actionType] == null) {
      schemasByActionType[actionType] = []
    }

    schemasByActionType[actionType].push(schema)
  }

  return Object.entries(schemasByActionType).map(([actionType, schemas]) => {
    const mergedProperties: Record<string, OpenapiSchema> = {}

    const allPropertyKeys = new Set<string>()
    for (const schema of schemas) {
      if (schema.properties != null) {
        Object.keys(schema.properties).forEach((key) =>
          allPropertyKeys.add(key),
        )
      }
    }

    for (const propKey of allPropertyKeys) {
      const propDefinitions = schemas
        .filter((schema) => schema.properties?.[propKey] != null)
        .map((schema) => schema.properties?.[propKey])

      if (propDefinitions.length === 0) continue

      const nonNullableDefinition = propDefinitions.find((prop) => {
        if (prop == null) return false

        return !(
          'nullable' in prop &&
          prop.nullable === true &&
          Object.keys(prop).length <= 1
        )
      })

      mergedProperties[propKey] =
        nonNullableDefinition ?? propDefinitions[0] ?? {}
    }

    // Ensure standard status field
    mergedProperties['status'] = {
      ...mergedProperties['status'],
      type: 'string',
      enum: ['success', 'pending', 'error'],
    }

    const schemaWithMergedProperties: OpenapiSchema = {
      ...(actionAttemptSchema['x-route-path'] !== null && {
        'x-route-path': actionAttemptSchema['x-route-path'],
      }),
      ...schemas[0],
      properties: mergedProperties,
    }

    const resource = createResource(
      'action_attempt',
      schemaWithMergedProperties,
      routes,
    )

    return {
      ...resource,
      resourceType: 'action_attempt',
      actionAttemptType: actionType,
    }
  })
}
