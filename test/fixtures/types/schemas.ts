import { z } from 'zod'

export const foo = z.object({
  foo_id: z.string().uuid(),
  name: z.string(),
  deprecated_prop: z.string().optional(),
  undocumented_prop: z.string().optional(),
  nullable_prop: z.string().optional().nullable(),
  number_prop: z.number().optional(),
  object_prop: z.record(z.string(), z.any()).optional(),
  array_prop: z.array(z.string()).optional(),
})
