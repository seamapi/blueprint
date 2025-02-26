import type { z } from 'zod'

import type { foo, pagination } from './schemas.js'

export type Foo = z.infer<typeof foo>

export type Pagination = z.infer<typeof pagination>
