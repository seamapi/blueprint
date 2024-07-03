import { openapi } from '@seamapi/types/connect'

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

  // Filter for /acs/systems/list
  const targetPath = '/acs/systems/list'
  const targetSchema = 'acs_system'

  // Check for fake data
  const isFakeData = openapi.info.title === 'Foo'

  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    if (!isFakeData && path !== targetPath) continue

    const route: Route = {
      path,
      namespace: { path: '/acs' }, // Hardcoded namespace for now
      endpoints: [],
      subroutes: [],
    }

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!operation) continue

      const endpoint: Endpoint = {
        name: operation.operationId || `${method}${path.replace(/\//g, '_')}`,
        path,
        methods: [method.toUpperCase() as Method],
        semanticMethod: method.toUpperCase() as Method,
        preferredMethod: method.toUpperCase() as Method,
        description: operation.summary || '',
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
        response: createResponse(operation.responses),
      }

      if (operation.parameters) {
        for (const param of operation.parameters) {
          const parameter: Parameter = {
            name: param.name,
            isRequired: param.required || false,
            isUndocumented: false,
            isDeprecated: false,
            deprecationMessage: '',
            description: param.description || '',
          }
          endpoint.parameters.push(parameter)
          endpoint.request.parameters.push(parameter)
        }
      }

      route.endpoints.push(endpoint)
    }

    blueprint.routes.push(route)
  }

  for (const [schemaName, schema] of Object.entries(
    openapi.components.schemas,
  )) {
    if (!isFakeData && schemaName !== targetSchema) continue

    blueprint.resources[schemaName] = {
      resourceType: schemaName,
      properties: createProperties(schema.properties),
    }
  }

  return blueprint
}

function createResponse(responses: any): Response {
  // Only checking for 200 response for now
  const okResponse = responses['200']
  if (!okResponse) return { responseType: 'void', description: 'No content' }

  const schema = okResponse.content?.['application/json']?.schema
  if (!schema)
    return { responseType: 'void', description: okResponse.description || '' }

  if (schema.type === 'array') {
    return {
      responseType: 'resource_list',
      responseKey: 'items',
      resourceType: schema.items?.$ref?.split('/').pop() || 'unknown',
      description: okResponse.description || '',
    }
  } else if (schema.type === 'object') {
    const refKey = Object.keys(schema.properties).find(
      (key) => schema.properties[key].$ref,
    )
    if (refKey) {
      return {
        responseType: 'resource',
        responseKey: refKey,
        resourceType:
          schema.properties[refKey].$ref.split('/').pop() || 'unknown',
        description: okResponse.description || '',
      }
    }
  }

  return { responseType: 'void', description: okResponse.description || '' }
}

function createProperties(properties: any): Property[] {
  if (!properties) return []

  return Object.entries(properties).map(([name, prop]: [string, any]) => {
    const baseProperty = {
      name,
      description: prop.description || '',
      isDeprecated: false,
      deprecationMessage: '',
    }

    switch (prop.type) {
      case 'string':
        return { ...baseProperty, type: 'string' }
      case 'object':
        return {
          ...baseProperty,
          type: 'object',
          properties: createProperties(prop.properties),
        }
      case 'array':
        return { ...baseProperty, type: 'list' }
      default:
        return { ...baseProperty, type: 'string' }
    }
  })
}

const blueprint = createBlueprint({ openapi })
console.log(JSON.stringify(blueprint, null, 2))
