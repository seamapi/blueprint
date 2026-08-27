import type * as z from 'zod/v3'

import type { foo, pagination } from './schemas.js'

export type Foo = z.infer<typeof foo>

export type Pagination = z.infer<typeof pagination>
