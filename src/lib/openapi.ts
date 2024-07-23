import { z } from 'zod'

const stringWithFormatSchema = z.object({
  type: z.literal('string'),
  format: z.string().optional(),
  description: z.string().optional(),
})

const numberSchema = z.object({
  type: z.enum(['number', 'integer']),
  format: z.string().optional(),
  description: z.string().optional(),
})

const booleanSchema = z.object({
  type: z.literal('boolean'),
  description: z.string().optional(),
})

const modelSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('object'),
      properties: z.record(modelSchema).optional(),
      required: z.array(z.string()).optional(),
      description: z.string().optional(),
    }),
    z.object({
      type: z.literal('array'),
      items: modelSchema,
      description: z.string().optional(),
    }),
    stringWithFormatSchema,
    numberSchema,
    booleanSchema,
    z.object({
      $ref: z.string(),
    }),
  ]),
)

export const infoSchema = z.object({
  title: z.string(),
  version: z.string(),
})

export const serverSchema = z.object({
  url: z.string(),
})

export const tagSchema = z.object({
  name: z.string(),
  description: z.string(),
})

export const parameterSchema = z.object({
  name: z.string(),
  in: z.enum(['query', 'header', 'path', 'cookie']),
  description: z.string().optional(),
  required: z.boolean().optional(),
  schema: modelSchema,
})

export const requestSchema = z.object({
  content: z.record(
    z.object({
      schema: modelSchema,
    }),
  ),
  description: z.string().optional(),
  required: z.boolean().optional(),
})

export const responseSchema = z.object({
  description: z.string(),
  content: z
    .record(
      z.object({
        schema: modelSchema,
      }),
    )
    .optional(),
})

export const operationSchema = z.object({
  operationId: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  parameters: z.array(parameterSchema).optional(),
  requestBody: requestSchema.optional(),
  responses: z.record(responseSchema),
  tags: z.array(z.string()).optional(),
  security: z.array(z.record(z.array(z.string()))).optional(),
  'x-undocumented': z.string().optional(),
  'x-deprecated': z.string().optional(),
})

export const pathItemSchema = z.object({
  get: operationSchema.optional(),
  post: operationSchema.optional(),
  put: operationSchema.optional(),
  delete: operationSchema.optional(),
  patch: operationSchema.optional(),
})

export const pathsSchema = z.record(pathItemSchema)

export const componentsSchema = z.object({
  schemas: z.record(modelSchema),
})

export const openapiSchema = z.object({
  openapi: z.string(),
  info: infoSchema,
  servers: z.array(serverSchema),
  tags: z.array(tagSchema),
  paths: pathsSchema,
  components: componentsSchema,
})

export type Openapi = z.infer<typeof openapiSchema>
export type OpenapiInfo = z.infer<typeof infoSchema>
export type OpenapiServer = z.infer<typeof serverSchema>
export type OpenapiTag = z.infer<typeof tagSchema>
export type OpenapiPaths = z.infer<typeof pathsSchema>
export type OpenapiPathItem = z.infer<typeof pathItemSchema>
export type OpenapiOperation = z.infer<typeof operationSchema>
export type OpenapiParameter = z.infer<typeof parameterSchema>
export type OpenapiRequestBody = z.infer<typeof requestSchema>
export type OpenapiResponse = z.infer<typeof responseSchema>
export type OpenapiSchema = z.infer<typeof modelSchema>
export type OpenapiComponents = z.infer<typeof componentsSchema>
