import { snakeCase } from 'change-case'

import { createJsonResponse } from './create-json-response.js'
import type { CodeSampleDefinition, Context } from './schema.js'

export const createPhpRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const requestParams = Object.entries(request.parameters)
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join(',')

  return `$seam${parts.map((p) => snakeCase(p)).join('->')}(${requestParams})`
}

export const createPhpResponse = createJsonResponse
