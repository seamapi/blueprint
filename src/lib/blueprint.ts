import type { Openapi } from './openapi.js'

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
  methods: Method[]
  semanticMethod: Method
  preferredMethod: Method
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

export interface TypesModule {
  openapi: Openapi
}

export const createBlueprint = ({
  openapi,
}: {
  openapi: Openapi
}): Blueprint => {
  const blueprint: Blueprint = {
    name: openapi.info.title,
    routes: [],
    resources: {},
  }

  const targetPath = '/acs/systems/list'
  const targetSchema = 'acs_system'

  const isFakeData = openapi.info.title === 'Foo'

  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    if (!isFakeData && path !== targetPath) continue

    const route: Route = {
      path,
      namespace: { path: '/acs' },
      endpoints: [],
      subroutes: [],
    }

    for (const [method, operation] of Object.entries(pathItem as Record<string, unknown>)) {
      if (typeof operation !== 'object' || operation === null) continue

      const endpoint: Endpoint = {
        name: 'operationId' in operation && typeof operation.operationId === 'string'
          ? operation.operationId
          : `${method}${path.replace(/\//g, '_')}`,
        path,
        methods: [method.toUpperCase() as Method],
        semanticMethod: method.toUpperCase() as Method,
        preferredMethod: method.toUpperCase() as Method,
        description: 'summary' in operation && typeof operation.summary === 'string'
          ? operation.summary
          : '',
        isUndocumented: false,
        isDeprecated: false,
        deprecationMessage: '',
        parameters: [],
        request: {
          methods: [method.toUpperCase() as Method],
          semanticMethod: method.toUpperCase() as Method,
          preferredMethod: method.toUpperCase() as Method,
          parameters: [],
        },
        response: createResponse('responses' in operation ? operation.responses : {}),
      }

      if ('parameters' in operation && Array.isArray(operation.parameters)) {
        for (const param of operation.parameters) {
          if (typeof param === 'object' && param !== null) {
            const parameter: Parameter = {
              name: 'name' in param && typeof param.name === 'string' ? param.name : '',
              isRequired: 'required' in param && typeof param.required === 'boolean' ? param.required : false,
              isUndocumented: false,
              isDeprecated: false,
              deprecationMessage: '',
              description: 'description' in param && typeof param.description === 'string' ? param.description : '',
            }
            endpoint.parameters.push(parameter)
            endpoint.request.parameters.push(parameter)
          }
        }
      }

      route.endpoints.push(endpoint)
    }

    blueprint.routes.push(route)
  }

  for (const [schemaName, schema] of Object.entries(openapi.components.schemas)) {
    if (!isFakeData && schemaName !== targetSchema) continue

    if (typeof schema === 'object' && schema !== null && 'properties' in schema && typeof schema.properties === 'object' && schema.properties !== null) {
      blueprint.resources[schemaName] = {
        resourceType: schemaName,
        properties: createProperties(schema.properties as Record<string, unknown>),
      }
    }
  }

  return blueprint
}

function createResponse(responses: unknown): Response {
  if (typeof responses !== 'object' || responses === null) {
    return { responseType: 'void', description: 'No content' }
  }

  const okResponse = (responses as Record<string, unknown>)['200']
  if (typeof okResponse !== 'object' || okResponse === null) {
    return { responseType: 'void', description: 'No content' }
  }

  const content = 'content' in okResponse ? okResponse.content : null
  if (typeof content !== 'object' || content === null) {
    return { responseType: 'void', description: 'description' in okResponse && typeof okResponse.description === 'string' ? okResponse.description : '' }
  }

  const jsonContent = 'application/json' in content ? content['application/json'] : null
  if (typeof jsonContent !== 'object' || jsonContent === null) {
    return { responseType: 'void', description: 'description' in okResponse && typeof okResponse.description === 'string' ? okResponse.description : '' }
  }

  const schema = 'schema' in jsonContent ? jsonContent.schema : null
  if (typeof schema !== 'object' || schema === null) {
    return { responseType: 'void', description: 'description' in okResponse && typeof okResponse.description === 'string' ? okResponse.description : '' }
  }

  if ('type' in schema && 'properties' in schema) {
    if (schema.type === 'array' && 'items' in schema && typeof schema.items === 'object' && schema.items !== null) {
      const refString = '$ref' in schema.items ? schema.items.$ref : null
      return {
        responseType: 'resource_list',
        responseKey: 'items',
        resourceType: typeof refString === 'string' && refString.length > 0 ? refString.split('/').pop() ?? 'unknown' : 'unknown',
        description: 'description' in okResponse && typeof okResponse.description === 'string' ? okResponse.description : '',
      }
    } else if (schema.type === 'object' && typeof schema.properties === 'object' && schema.properties !== null) {
      const properties = schema.properties as Record<string, unknown>
      const refKey = Object.keys(properties).find(
        (key) => typeof properties[key] === 'object' &&
          properties[key] !== null &&
          '$ref' in (properties[key] as Record<string, unknown>)
      )
      if (refKey != null) {
        const refString = '$ref' in (properties[refKey] as Record<string, unknown>)
          ? (properties[refKey] as Record<string, unknown>)['$ref']
          : null
        return {
          responseType: 'resource',
          responseKey: refKey,
          resourceType: typeof refString === 'string' && refString.length > 0 ? refString.split('/').pop() ?? 'unknown' : 'unknown',
          description: 'description' in okResponse && typeof okResponse.description === 'string' ? okResponse.description : '',
        }
      }
    }
  }

  return { responseType: 'void', description: 'description' in okResponse && typeof okResponse.description === 'string' ? okResponse.description : '' }
}

function createProperties(properties: Record<string, unknown>): Property[] {
  return Object.entries(properties).map(([name, prop]): Property => {
    if (typeof prop !== 'object' || prop === null) {
      return { name, type: 'string', isDeprecated: false, deprecationMessage: '' }
    }

    const baseProperty = {
      name,
      description: 'description' in prop && typeof prop.description === 'string' ? prop.description : '',
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
            properties: 'properties' in prop && typeof prop.properties === 'object' && prop.properties !== null
              ? createProperties(prop.properties as Record<string, unknown>)
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