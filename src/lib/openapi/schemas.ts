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
  'x-draft': z.string().default(''),
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

export const AuthMethodSchema = z
  .enum([
    'api_key',
    'client_session',
    'console_session_token_with_workspace',
    'console_session_token_without_workspace',
    'pat_with_workspace',
    'pat_without_workspace',
    'publishable_key',
    'unknown',
  ])
  .catch('unknown')

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
  security: z.array(z.record(AuthMethodSchema, z.array(z.never()))).default([]),
  deprecated: z.boolean().default(false),
  'x-response-key': z.string().nullable().optional(),
  'x-title': z.string().default(''),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
  'x-draft': z.string().default(''),
})

export const PropertySchema: z.ZodSchema<any> = z.object({
  type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object']),
  description: z.string().default(''),
  deprecated: z.boolean().default(false),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
  'x-draft': z.string().default(''),
  enum: z.array(z.string().or(z.boolean())).optional(),
  $ref: z.string().optional(),
  format: z.string().optional(),
})

export const ResourceSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), PropertySchema),
  required: z.array(z.string()).default([]),
  description: z.string().default(''),
  'x-route-path': z.string().default(''),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
  'x-draft': z.string().default(''),
})

export const EventResourceSchema = z.object({
  discriminator: z.object({ propertyName: z.string() }),
  oneOf: z.array(ResourceSchema),
})
