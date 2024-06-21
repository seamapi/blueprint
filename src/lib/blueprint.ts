import type { Openapi } from './openapi.js'

interface Parameter {
  name: string
  isRequired: boolean
  description: string
}

interface Response {
  description: string
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// Single endpoint
interface Endpoint {
  name: string 
  path: string 
  method: Method[]
  routeDescription: string
  parameters: Parameter[]
  response: Response
}

// Collection of endpoints and potentially subroutes
interface Route {
  name: string 
  path: string 
  namespace: Namespace | null 
  endpoints: Endpoint[]
  subroutes: Route[] | null
}

// A namespace containing routes
interface Namespace {
  name: string 
  path: string 
}

export interface Blueprint {
  name: string
  routes: Route[]
}

export interface TypesModule {
  openapi: Openapi
}

export const createBlueprint = ({ openapi }: TypesModule): Blueprint => {
  return {
    name: openapi.info.title,
  }
}
