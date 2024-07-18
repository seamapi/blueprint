import { z } from 'zod'

const componentSchemaSchema = z.object({
  type: z.string(),
  properties: z.record(
    z.object({
      description: z.string().optional(),
      format: z.string().optional(),
      type: z.string(),
    }),
  ),
  required: z.array(z.string()),
})

const componentsSchema = z.object({
  schemas: z.record(componentSchemaSchema),
})

const responseContentSchema = z.object({
  'application/json': z.object({
    schema: z.object({
      properties: z.record(
        z.union([
          z.object({ type: z.string() }),
          z.object({ $ref: z.string() }),
        ]),
      ),
      required: z.array(z.string()),
      type: z.string(),
    }),
  }),
})

const responseSchema = z.object({
  content: responseContentSchema.optional(),
  description: z.string(),
})

const operationSchema = z.object({
  operationId: z.string(),
  responses: z.record(responseSchema),
  security: z.array(z.unknown()),
  summary: z.string(),
  tags: z.array(z.string()),
})

const pathItemSchema = z.object({
  get: operationSchema.optional(),
  post: operationSchema.optional(),
  put: operationSchema.optional(),
  delete: operationSchema.optional(),
  patch: operationSchema.optional(),
})

const pathsSchema = z.record(pathItemSchema)

const openApiSchema = z.object({
  openapi: z.string(),
  info: z.object({
    title: z.string(),
    version: z.string(),
  }),
  servers: z.array(
    z.object({
      url: z.string(),
    }),
  ),
  tags: z.array(
    z.object({
      description: z.string(),
      name: z.string(),
    }),
  ),
  components: componentsSchema,
  paths: pathsSchema,
})

type OpenApiSpec = z.infer<typeof openApiSchema>

export { openApiSchema, type OpenApiSpec }
