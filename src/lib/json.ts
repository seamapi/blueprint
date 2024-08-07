import { z } from 'zod'

// https://zod.dev/?id=json-type
const LiteralSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

type Literal = z.infer<typeof LiteralSchema>

export type Json = Literal | { [key: string]: Json } | Json[]

export type NonNullJson = Exclude<Json, null>

export const JsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([LiteralSchema, z.array(JsonSchema), z.record(JsonSchema)]),
)
