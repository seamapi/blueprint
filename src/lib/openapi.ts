import { z } from 'zod'

const ZStringWithFormat = z.object({
  type: z.literal('string'),
  format: z.string().optional(),
  description: z.string().optional(),
})

const ZNumber = z.object({
  type: z.enum(['number', 'integer']),
  format: z.string().optional(),
  description: z.string().optional(),
})

const ZBoolean = z.object({
  type: z.literal('boolean'),
  description: z.string().optional(),
})

const ZSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('object'),
      properties: z.record(ZSchema).optional(),
      required: z.array(z.string()).optional(),
      description: z.string().optional(),
    }),
    z.object({
      type: z.literal('array'),
      items: ZSchema,
      description: z.string().optional(),
    }),
    ZStringWithFormat,
    ZNumber,
    ZBoolean,
    z.object({
      $ref: z.string(),
    }),
  ])
)

export const ZOpenapiInfo = z.object({
  title: z.string(),
  version: z.string(),
})

export const ZOpenapiServer = z.object({
  url: z.string(),
})

export const ZOpenapiTag = z.object({
  name: z.string(),
  description: z.string(),
})

export const ZOpenapiParameter = z.object({
  name: z.string(),
  in: z.enum(['query', 'header', 'path', 'cookie']),
  description: z.string().optional(),
  required: z.boolean().optional(),
  schema: ZSchema,
})

export const ZOpenapiRequestBody = z.object({
  content: z.record(z.object({
    schema: ZSchema,
  })),
  description: z.string().optional(),
  required: z.boolean().optional(),
})

export const ZOpenapiResponse = z.object({
  description: z.string(),
  content: z.record(z.object({
    schema: ZSchema,
  })).optional(),
})

export const ZOpenapiOperation = z.object({
  operationId: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  parameters: z.array(ZOpenapiParameter).optional(),
  requestBody: ZOpenapiRequestBody.optional(),
  responses: z.record(ZOpenapiResponse),
  tags: z.array(z.string()).optional(),
  security: z.array(z.record(z.array(z.string()))).optional(),
  'x-undocumented': z.string().optional(),
  'x-deprecated': z.string().optional(),
})

export const ZOpenapiPathItem = z.object({
  get: ZOpenapiOperation.optional(),
  post: ZOpenapiOperation.optional(),
  put: ZOpenapiOperation.optional(),
  delete: ZOpenapiOperation.optional(),
  patch: ZOpenapiOperation.optional(),
})

export const ZOpenapiPaths = z.record(ZOpenapiPathItem)

export const ZOpenapiComponents = z.object({
  schemas: z.record(ZSchema),
})

export const ZOpenapi = z.object({
  openapi: z.string(),
  info: ZOpenapiInfo,
  servers: z.array(ZOpenapiServer),
  tags: z.array(ZOpenapiTag),
  paths: ZOpenapiPaths,
  components: ZOpenapiComponents,
})

export type Openapi = z.infer<typeof ZOpenapi>
export type OpenapiInfo = z.infer<typeof ZOpenapiInfo>
export type OpenapiServer = z.infer<typeof ZOpenapiServer>
export type OpenapiTag = z.infer<typeof ZOpenapiTag>
export type OpenapiPaths = z.infer<typeof ZOpenapiPaths>
export type OpenapiPathItem = z.infer<typeof ZOpenapiPathItem>
export type OpenapiOperation = z.infer<typeof ZOpenapiOperation>
export type OpenapiParameter = z.infer<typeof ZOpenapiParameter>
export type OpenapiRequestBody = z.infer<typeof ZOpenapiRequestBody>
export type OpenapiResponse = z.infer<typeof ZOpenapiResponse>
export type OpenapiSchema = z.infer<typeof ZSchema>
export type OpenapiComponents = z.infer<typeof ZOpenapiComponents>