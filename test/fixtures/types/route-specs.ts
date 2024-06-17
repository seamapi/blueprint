import { z } from 'zod'

import * as schemas from './schemas.js'

export const routes = {
  '/foos/get': {
    auth: 'none',
    methods: ['GET', 'POST'],
    jsonResponse: z.object({
      foo: schemas.foo,
    }),
  },
} as const
