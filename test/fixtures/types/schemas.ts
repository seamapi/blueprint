import { z } from 'zod'

export const foo = z.object({
  foo_id: z.string().uuid(),
  name: z.string(),
})
