import { z } from 'zod'

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
  'x-undocumented'?: string
  'x-deprecated'?: string
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
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  properties?: Record<string, OpenapiSchema>
  items?: OpenapiSchema
  $ref?: string
  required?: string[]
  format?: string
  description?: string
}

export interface OpenapiComponents {
  schemas: Record<string, OpenapiSchema>
}

export type OpenapiSecurity = Record<string, string[]>

export const openapiOperationSchemaValidator = z.object({
  operationId: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  parameters: z
    .array(
      z.object({
        name: z.string(),
        in: z.enum(['query', 'header', 'path', 'cookie']),
        description: z.string().optional(),
        required: z.boolean().optional(),
        schema: z.any(),
      }),
    )
    .optional(),
  requestBody: z
    .object({
      content: z.record(
        z.object({
          schema: z.any(),
        }),
      ),
      description: z.string().optional(),
      required: z.boolean().optional(),
    })
    .optional(),
  responses: z.record(
    z.object({
      description: z.string(),
      content: z
        .record(
          z.object({
            schema: z.any(),
          }),
        )
        .optional(),
    }),
  ),
  tags: z.array(z.string()).optional(),
  security: z.record(z.string()).optional(),
  'x-undocumented': z.string().default('true'),
  'x-deprecated': z.string().default('false'),
})
