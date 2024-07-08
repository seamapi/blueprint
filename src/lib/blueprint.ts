import type {
  OpenAPI,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIPathItem,
  OpenAPIPaths,
  OpenAPISchema,
} from './openapi.js'

export interface Blueprint {
  name: string
  routes: Route[]
  resources: Record<string, Resource>
}

interface Route {
  path: string
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[]
}

interface Resource {
  resourceType: string
  properties: Property[]
}

interface Namespace {
  path: string
}

interface Endpoint {
  name: string
  path: string
  description: string
  isUndocumented: boolean
  isDeprecated: boolean
  deprecationMessage: string
  parameters: Parameter[]
  request: Request
  response: Response
}

interface Parameter {
  name: string
  isRequired: boolean
  isUndocumented: boolean
  isDeprecated: boolean
  deprecationMessage: string
  description: string
}

interface Request {
  methods: Method[]
  semanticMethod: Method
  preferredMethod: Method
  parameters: Parameter[]
}

type Response = VoidResponse | ResourceResponse | ResourceListResponse

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
}

type Property =
  | StringProperty
  | EnumProperty
  | RecordProperty
  | ListProperty
  | ObjectProperty

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

interface ObjectProperty extends BaseProperty {
  type: 'object'
  properties: Property[]
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

type LowercaseMethod = Lowercase<Method>

export interface TypesModule {
  openapi: OpenAPI
}

export const createBlueprint = ({ openapi }: TypesModule): Blueprint => {
  const isFakeData = openapi.info.title === 'Foo'
  const targetPath = '/acs/systems/list'
  const targetSchema = 'acs_system'

  return {
    name: openapi.info.title,
    routes: createRoutes(openapi.paths, isFakeData, targetPath),
    resources: createResources(
      openapi.components.schemas,
      isFakeData,
      targetSchema,
    ),
  }
}

const createRoutes = (
  paths: OpenAPIPaths,
  isFakeData: boolean,
  targetPath: string,
): Route[] => {
  return Object.entries(paths)
    .filter(([path]) => isFakeData || path === targetPath)
    .map(([path, pathItem]) => createRoute(path, pathItem))
}

const createRoute = (path: string, pathItem: OpenAPIPathItem): Route => {
  const pathParts = path.split('/')
  const routePath = `/${pathParts.slice(1, -1).join('/')}`

  return {
    path: routePath,
    namespace: { path: `/${pathParts[1]}` },
    endpoints: createEndpoints(path, pathItem),
    subroutes: [],
  }
}

const createEndpoints = (
  path: string,
  pathItem: OpenAPIPathItem,
): Endpoint[] => {
  return Object.entries(pathItem)
    .filter(
      ([, operation]) => typeof operation === 'object' && operation !== null,
    )
    .map(([method, operation]) =>
      createEndpoint(method, operation as OpenAPIOperation, path),
    )
}

const createEndpoint = (
  method: string,
  operation: OpenAPIOperation,
  path: string,
): Endpoint => {
  const pathParts = path.split('/')
  const endpointPath = `/${pathParts.slice(1, -1).join('/')}`

  return {
    name:
      'operationId' in operation && typeof operation.operationId === 'string'
        ? operation.operationId
        : `${path.replace(/\//g, '')}${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}`,
    path: endpointPath,
    description:
      'description' in operation && typeof operation.description === 'string'
        ? operation.description
        : '',
    isUndocumented: false,
    isDeprecated: false,
    deprecationMessage: '',
    parameters: createParameters(operation),
    request: createRequest(method, operation),
    response: createResponse(
      'responses' in operation ? operation.responses : {},
    ),
  }
}

const createParameters = (operation: OpenAPIOperation): Parameter[] => {
  return 'parameters' in operation && Array.isArray(operation.parameters)
    ? operation.parameters
        .filter((param) => typeof param === 'object' && param !== null)
        .map(createParameter)
    : []
}

const createParameter = (param: OpenAPIParameter): Parameter => {
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
  method: string,
  operation: OpenAPIOperation,
): Request => {
  const uppercaseMethod = openapiMethodToMethod(
    method.toLowerCase() as LowercaseMethod,
  )

  return {
    methods: [uppercaseMethod],
    semanticMethod: uppercaseMethod,
    preferredMethod: uppercaseMethod,
    parameters: createParameters(operation),
  }
}

const createResources = (
  schemas: OpenAPI['components']['schemas'],
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
        acc[schemaName] = {
          resourceType: schemaName,
          properties: createProperties(schema.properties),
        }
      }
      return acc
    }, {})
}

const createResponse = (responses: OpenAPIOperation['responses']): Response => {
  if (typeof responses !== 'object' || responses === null) {
    return { responseType: 'void', description: 'No description available' }
  }

  const okResponse = responses['200']
  if (typeof okResponse !== 'object' || okResponse === null) {
    return { responseType: 'void', description: 'No description available' }
  }

  const content = 'content' in okResponse ? okResponse.content : null
  if (typeof content !== 'object' || content === null) {
    return {
      responseType: 'void',
      description:
        'description' in okResponse &&
        typeof okResponse.description === 'string'
          ? okResponse.description
          : 'No description available',
    }
  }

  const jsonContent =
    'application/json' in content ? content['application/json'] : null
  if (typeof jsonContent !== 'object' || jsonContent === null) {
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
  if (typeof schema !== 'object' || schema === null) {
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
      const refKey = Object.keys(properties).find(
        (key) =>
          typeof properties[key] === 'object' &&
          properties[key] !== null &&
          '$ref' in properties[key] &&
          typeof properties[key].$ref === 'string',
      )
      if (refKey != null && properties[refKey] != null) {
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
  properties: Record<string, OpenAPISchema>,
): Property[] => {
  return Object.entries(properties).map(([name, prop]): Property => {
    if (typeof prop !== 'object' || prop === null) {
      return {
        name,
        type: 'string',
        isDeprecated: false,
        deprecationMessage: '',
      }
    }

    const baseProperty = {
      name,
      description:
        'description' in prop && typeof prop.description === 'string'
          ? prop.description
          : '',
      isDeprecated: false,
      deprecationMessage: '',
    }

    if ('type' in prop) {
      switch (prop.type) {
        case 'string':
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
        default:
          return { ...baseProperty, type: 'string' }
      }
    }

    return { ...baseProperty, type: 'string' }
  })
}

const openapiMethodToMethod = (openapiMethod: LowercaseMethod): Method => {
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
  }
}
