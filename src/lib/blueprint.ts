import type { Openapi } from './openapi.js'

export interface Blueprint {
  name: string
  routes: Route[]
  resources: Record<ResourceType, Resource>
}

interface Route {
  path: string
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[]
}

interface Resource {
  resourceType: ResourceType
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

interface Response {
  description: string
  responseType: 'resource' | 'resource_list' | 'void'
  responseKey: string | null
  resourceType: ResourceType | null
}

interface Property {
  name: string
  type: 'string' | 'enum' | 'record' | 'list' | 'object'
  properties: Property[] | null
}

type ResourceType = 'access_code' | 'user' | 'order' | string

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface TypesModule {
  openapi: Openapi
}

export const createBlueprint = ({ openapi }: TypesModule): Blueprint => {
  return {
    name: openapi.info.title,
    routes: [],
    resources: {}
  }
}
