import type { z } from 'zod'

import type { foo } from './schemas.js'

export type Foo = z.infer<typeof foo>
