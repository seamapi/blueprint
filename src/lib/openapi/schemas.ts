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
    'client_session_with_customer',
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
  security: z
    .array(z.record(z.string().pipe(AuthMethodSchema), z.array(z.never())))
    .default([]),
  deprecated: z.boolean().default(false),
  'x-response-key': z.string().nullable().optional(),
  'x-title': z.string().default(''),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
  'x-draft': z.string().default(''),
  'x-action-attempt-type': z.string().optional(),
})

export const EnumValueSchema = z.object({
  description: z.string().default(''),
  undocumented: z.string().default(''),
  deprecated: z.string().default(''),
  draft: z.string().default(''),
})

const PropertyGroupSchema = z
  .record(
    z.string(),
    z.object({
      name: z.string(),
    }),
  )
  .default({})

const VariantGroupSchema = PropertyGroupSchema

const commonPropertyFields = {
  description: z.string().default(''),
  deprecated: z.boolean().default(false),
  default: z.any().optional(),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
  'x-draft': z.string().default(''),
  'x-property-group-key': z.string().default(''),
  'x-property-groups': PropertyGroupSchema,
  'x-variant-groups': VariantGroupSchema,
}

export const PropertySchema: z.ZodSchema<any> = z.union([
  z.object({
    type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object']),
    ...commonPropertyFields,
    enum: z.array(z.string().or(z.boolean())).optional(),
    'x-enums': z.record(z.string(), EnumValueSchema).optional(),
    format: z.string().optional(),
    $ref: z.string().optional(),
  }),

  z.object({
    oneOf: z.array(z.lazy(() => PropertySchema)),
    ...commonPropertyFields,
    discriminator: z.object({ propertyName: z.string() }).optional(),
  }),

  z.object({
    allOf: z.array(z.lazy(() => PropertySchema)),
    ...commonPropertyFields,
  }),
])

export const ResourceSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), PropertySchema),
  required: z.array(z.string()).default([]),
  description: z.string().default(''),
  'x-route-path': z.string().default(''),
  'x-undocumented': z.string().default(''),
  'x-deprecated': z.string().default(''),
  'x-draft': z.string().default(''),
  'x-property-groups': PropertyGroupSchema,
  'x-variant-groups': VariantGroupSchema,
})

export const EventResourceSchema = z.object({
  'x-route-path': z.string().default(''),
  discriminator: z.object({ propertyName: z.string() }),
  oneOf: z.array(ResourceSchema),
})
