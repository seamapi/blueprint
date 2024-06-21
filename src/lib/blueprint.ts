import { openapi } from '@seamapi/types/connect'

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

interface Endpoint {
  name: string
  path: string
  method: Method[]
  routeDescription?: string | undefined
  parameters: Parameter[]
  response: Response
}

interface Route {
  name: string
  path: string
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[] | null
}

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
  const routes: Route[] = []

  for (const [path, methods] of Object.entries(openapi.paths)) {
    const endpoints: Endpoint[] = []

    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const namespaceName = (operation.tags?.[0]) ?? null
        const namespace: Namespace | null = (namespaceName != null) ? { name: namespaceName, path: namespaceName } : null

        endpoints.push({
          name: operation.operationId,
          path,
          method: [method.toUpperCase() as Method],
          routeDescription: operation.summary,
          parameters: [],  // Assuming no parameters for simplicity
          response: {
            description: Object.values(operation.responses)[0]?.description ?? 'No Description'
          }
        })

        routes.push({
          name: `${path}-${method.toUpperCase()}`,
          path,
          namespace,
          endpoints,
          subroutes: null  // Assuming no subroutes for simplicity
        })
      }
    }
  }

  return {
    name: openapi.info.title,
    routes,
  }
}

console.log(JSON.stringify(createBlueprint({ openapi }), null, 2))