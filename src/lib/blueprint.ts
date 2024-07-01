import type { Openapi } from './openapi.js'

export interface Blueprint<T extends TypesModule> {
  name: string
  routes: Array<Route<T>>
  resources: Partial<Record<ResourceType<T>, Resource<T>>>
}

interface Route<T extends TypesModule> {
  path: string
  namespace: Namespace | null
  endpoints: Array<Endpoint<T>>
  subroutes: Array<Route<T>>
}

interface Resource<T extends TypesModule> {
  resourceType: ResourceType<T>
  properties: Property[]
}

// Helper type to safely access nested properties of openapi schema - defualt to unknown if not found
type SafeAccess<T, K extends string> = K extends keyof T ? T[K] : unknown

type ResourceType<T extends TypesModule> = keyof SafeAccess<
  SafeAccess<T['openapi'], 'components'>,
  'schemas'
>

interface Namespace {
  path: string
}

interface Endpoint<T extends TypesModule> {
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
  response: Response<T>
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

interface Response<T extends TypesModule> {
  description: string
  responseType: 'resource' | 'resource_list' | 'void'
  responseKey: string | null
  resourceType: ResourceType<T>
}

interface Property {
  name: string
  type: 'string' | 'enum' | 'record' | 'list' | 'object'
  properties: Property[] | null
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface TypesModule {
  openapi: Openapi
}

export const createBlueprint = <T extends TypesModule>({
  openapi,
}: T): Blueprint<T> => {
  return {
    name: openapi.info.title,
    routes: [],
    resources: {},
  }
}
