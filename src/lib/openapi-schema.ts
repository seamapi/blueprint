import { z } from 'zod'

export const ParameterSchema = z.object({
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

const ResponseSchema = z.record(
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

export const OpenapiOperationSchema = z.object({
  operationId: z.string(),
  summary: z.string().optional(),
  description: z.string().default(''),
  parameters: z.array(ParameterSchema).optional(),
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
  responses: ResponseSchema,
  deprecated: z.boolean().default(false),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
})

export const PropertySchema: z.ZodSchema<any> = z.object({
  type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object']),
  description: z.string().default(''),
  deprecated: z.boolean().default(false),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
  enum: z.array(z.string()).optional(),
  $ref: z.string().optional(),
})
