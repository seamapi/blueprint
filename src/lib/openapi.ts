export interface Openapi {
  openapi: string
  info: OpenapiInfo
  servers: OpenapiServer[]
  tags: OpenapiTag[]
  paths: OpenapiPaths
  components: OpenapiComponents
}

export interface OpenapiInfo {
  title: string
  version: string
}

export interface OpenapiServer {
  url: string
}

export interface OpenapiTag {
  name: string
  description: string
}

export type OpenapiPaths = Record<string, OpenapiPathItem>

export interface OpenapiPathItem {
  get?: OpenapiOperation
  post?: OpenapiOperation
  put?: OpenapiOperation
  delete?: OpenapiOperation
  patch?: OpenapiOperation
}

export interface OpenapiOperation {
  operationId: string
  summary?: string
  description?: string
  parameters?: OpenapiParameter[]
  requestBody?: OpenapiRequestBody
  responses: Record<string, OpenapiResponse>
  tags?: string[]
  security?: OpenapiSecurity[]
}

export interface OpenapiParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  schema: OpenapiSchema
}

export interface OpenapiRequestBody {
  content: Record<string, OpenapiMediaType>
  description?: string
  required?: boolean
}

export interface OpenapiResponse {
  description: string
  content?: Record<string, OpenapiMediaType>
}

export interface OpenapiMediaType {
  schema: OpenapiSchema
}

export interface OpenapiSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  properties?: Record<string, OpenapiSchema>
  items?: OpenapiSchema
  $ref?: string
  required?: string[]
  format?: string
  description?: string
  deprecated?: boolean
  'x-deprecated'?: string
  'x-draft'?: string
  'x-undocumented'?: string
  'x-route-path'?: string
}

export interface OpenapiComponents {
  schemas: Record<string, OpenapiSchema>
}

export type OpenapiSecurity = Record<string, string[]>
