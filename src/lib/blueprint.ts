import type { Openapi } from './openapi.js'

export interface Blueprint {
  name: string
  routes: Route[]
}

interface Route {
  name: string
  path: string
  // descriptions will default to an empty string and emit a warning, e.g. 
  // if (description.trim().length === 0) console.warn(`... has an empty description`)
  description: string 
  namespace: Namespace | null
  endpoints: Endpoint[]
  subroutes: Route[]
}

interface Namespace {
  name: string
  description: string
  path: string
}

interface Endpoint {
  name: string
  path: string
  methods: Method[]
  semanticMethod: Method
  preferredMethod: Method
  description: string
  // if (isDeprecated && deprecationMessage.trim().length === 0) console.warn(`... has an empty deprecation message`)
  isDeprecated: boolean
  deprecationMessage: string
  parameters: Parameter[]
  request: Request
  response: Response
}

interface Parameter {
  name: string
  // TODO generate isRequired, isDeprecated, deprecationMessage from https://github.com/seamapi/nextlove/pull/133/files
  isRequired: boolean
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
  // TODO: fix generation once we agree on the blueprint schema
  const routes: Route[] = []

  for (const [path, methods] of Object.entries(openapi.paths)) {
    const endpoints: Endpoint[] = []

    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const namespaceName = operation.tags?.[0] ?? null
        const namespace: Namespace | null =
          namespaceName != null
            ? { name: namespaceName, description: '', path: namespaceName }
            : null

        endpoints.push({
          name: operation.operationId,
          path,
          methods: [method.toUpperCase() as Method],
          description: operation.summary ?? 'No Description',
          parameters: [
            {
              name: '',
              description: '',
              isRequired: false,
              isDeprecated: false,
              deprecationMessage: '',
            },
          ],
          response: {
            description:
              Object.values(operation.responses)[0]?.description ??
              'No Description',
          },
          semanticMethod: 'GET',
          preferredMethod: 'POST',
          isDeprecated: false,
          deprecationMessage: '',
        })

        routes.push({
          name: `${path}-${method.toUpperCase()}`,
          path,
          namespace,
          endpoints,
          // TODO: implement optional subroutes extraction
          subroutes: [],
          description: '',
        })
      }
    }
  }

  return {
    name: openapi.info.title,
    routes,
  }
}
