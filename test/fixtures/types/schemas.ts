import { z } from 'zod'

export const foo = z.object({
  foo_id: z.string().uuid(),
  name: z.string(),
  deprecated_prop: z.string().optional(),
  undocumented_prop: z.string().optional(),
  nullable_property: z.string().optional().nullable(),
})
