import { z } from 'zod'

export const parameterSchema = z.object({
  name: z.string(),
  in: z.enum(['query', 'header', 'path', 'cookie']),
  description: z.string().default(''),
  required: z.boolean().default(false),
  schema: z
    .object({
      type: z.string(),
      format: z.string().optional(),
    })
    .optional(),
  deprecated: z.boolean().default(false),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
})

const responseSchema = z.record(
  z.string(),
  z.object({
    description: z.string(),
    content: z
      .record(
        z.string(),
        z.object({
          schema: z.object({
            $ref: z.string().optional(),
            type: z.string().optional(),
            items: z
              .object({
                $ref: z.string(),
              })
              .optional(),
          }),
        }),
      )
      .optional(),
  }),
)

export const openapiOperationSchema = z.object({
  operationId: z.string(),
  summary: z.string().optional(),
  description: z.string().default(''),
  parameters: z.array(parameterSchema).optional(),
  requestBody: z
    .object({
      content: z.record(
        z.string(),
        z.object({
          schema: z.object({
            $ref: z.string().optional(),
            type: z.string().optional(),
          }),
        }),
      ),
    })
    .optional(),
  responses: responseSchema,
  deprecated: z.boolean().default(false),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
})

export const propertySchema: z.ZodSchema<any> = z.object({
  type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object']),
  description: z.string().default(''),
  deprecated: z.boolean().default(false),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
  enum: z.array(z.string()).optional(),
  items: z.union([
    z.object({
      type: z.string().optional(),
      $ref: z.string().optional(),
    }),
    z.lazy(() => propertySchema),
  ]).optional(),
  $ref: z.string().optional(),
})
