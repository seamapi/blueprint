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
  '/foos/list': {
    auth: 'none',
    methods: ['GET', 'POST'],
    jsonResponse: z.object({
      foos: z.array(schemas.foo),
    }),
    '/transport/air/planes/list': {
      auth: 'none',
      methods: ['GET'],
      jsonResponse: z.object({
        planes: z.array(schemas.plane),
      }),
    },
    '/deprecated/undocumented/endpoint': {
      auth: 'none',
      methods: ['GET'],
      jsonResponse: z.object({}),
    },
    '/draft/endpoint': {
      auth: 'none',
      methods: ['GET'],
      jsonResponse: z.object({}),
    },
  },
} as const
