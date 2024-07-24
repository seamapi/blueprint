import { z } from "zod"

const parameterSchema = z.object({
  name: z.string(),
  in: z.enum(['query', 'header', 'path', 'cookie']),
  description: z.string().optional(),
  required: z.boolean().optional(),
  schema: z.object({
    type: z.string(),
    format: z.string().optional(),
  }).optional(),
})

const responseSchema = z.record(
  z.string(),
  z.object({
    description: z.string(),
    content: z.record(
      z.string(),
      z.object({
        schema: z.object({
          $ref: z.string().optional(),
          type: z.string().optional(),
          items: z.object({
            $ref: z.string(),
          }).optional(),
        }),
      })
    ).optional(),
  })
)

export const openapiOperationSchema = z.object({
  operationId: z.string(),
  summary: z.string().optional(),
  description: z.string().default(''),
  parameters: z.array(parameterSchema).optional(),
  requestBody: z.object({
    content: z.record(z.string(), z.object({
      schema: z.object({
        $ref: z.string().optional(),
        type: z.string().optional(),
      }),
    })),
  }).optional(),
  responses: responseSchema,
  deprecated: z.boolean().default(false),
  'x-undocumented': z.boolean().default(false),
  'x-deprecated': z.string().default(''),
})