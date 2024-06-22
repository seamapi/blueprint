import type { Openapi } from './openapi.js'

export interface Blueprint {
  name: string
  routes: Route[]
}
interface Endpoint {
  name: string
  path: string
  methods: Method[]
  semanticMethod: Method
  preferredMethod: Method
  description: string | null
  isDeprecated: boolean
  depractionMessage: string
  parameters: Parameter[]
  response: Response
}

interface Route {
  name: string
  path: string
  description: string | null
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[]
}

interface Namespace {
  name: string
  path: string
}

interface Parameter {
  name: string
  // TODO generate isRequired, isDeprecated, deprecationMessage from https://github.com/seamapi/nextlove/pull/133/files
  isRequired: boolean
  isDeprecated: boolean
  deprecationMessage: string
  description: string
}

interface Response {
  description: string
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface TypesModule {
  openapi: Openapi
}
export const createBlueprint = ({ openapi }: TypesModule): Blueprint => {
  const routes: Route[] = []

  for (const [path, methods] of Object.entries(openapi.paths)) {
    const endpoints: Endpoint[] = []

    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const namespaceName = operation.tags?.[0] ?? null
        const namespace: Namespace | null =
          namespaceName != null
            ? { name: namespaceName, path: namespaceName }
            : null

        endpoints.push({
          name: operation.operationId,
          path,
          methods: [method.toUpperCase() as Method],
          description: operation.summary || 'No Description',
          parameters: {
            isRequired: false,
            isDeprecated: false,
            deprecationMessage: ''
          },
          response: {
            description:
              Object.values(operation.responses)[0]?.description ??
              'No Description',
          },
        })

        routes.push({
          name: `${path}-${method.toUpperCase()}`,
          path,
          namespace,
          endpoints,
          // TODO: implement optional subroutes extraction
          subroutes: '',
        })
      }
    }
  }

  return {
    name: openapi.info.title,
    routes,
  }
}
