import type { Openapi } from './openapi.js'

export interface Blueprint {
  name: string
  routes: Route[]
}

interface Route {
  path: string
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[]
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
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface TypesModule {
  openapi: Openapi
}

export const createBlueprint = ({ openapi }: TypesModule): Blueprint => {
  return {
    name: openapi.info.title,
    routes: [],
  }
}
