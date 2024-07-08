export interface OpenAPI {
  openapi: string
  info: OpenAPIInfo
  servers: OpenAPIServer[]
  tags: OpenAPITag[]
  paths: OpenAPIPaths
  components: OpenAPIComponents
}

export interface OpenAPIInfo {
  title: string
  version: string
}

export interface OpenAPIServer {
  url: string
}

export interface OpenAPITag {
  name: string
  description: string
}

export type OpenAPIPaths = Record<string, OpenAPIPathItem>

export interface OpenAPIPathItem {
  get?: OpenAPIOperation
  post?: OpenAPIOperation
  put?: OpenAPIOperation
  delete?: OpenAPIOperation
  patch?: OpenAPIOperation
}

export interface OpenAPIOperation {
  operationId: string
  summary?: string
  description?: string
  parameters?: OpenAPIParameter[]
  requestBody?: OpenAPIRequestBody
  responses: Record<string, OpenAPIResponse>
  tags?: string[]
  security?: OpenAPISecurity[]
}

export interface OpenAPIParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  schema: OpenAPISchema
}

export interface OpenAPIRequestBody {
  content: Record<string, OpenAPIMediaType>
  description?: string
  required?: boolean
}

export interface OpenAPIResponse {
  description: string
  content?: Record<string, OpenAPIMediaType>
}

export interface OpenAPIMediaType {
  schema: OpenAPISchema
}

export interface OpenAPISchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  properties?: Record<string, OpenAPISchema>
  items?: OpenAPISchema
  $ref?: string
  required?: string[]
  format?: string
  description?: string
}

export interface OpenAPIComponents {
  schemas: Record<string, OpenAPISchema>
}

export type OpenAPISecurity = Record<string, string[]>