import { camelCase } from 'change-case'

import { createJsonResponse } from './create-json-response.js'
import type { CodeSampleDefinition, Context } from './schema.js'

export const createJavascriptRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  return `await seam${parts.map((p) => camelCase(p)).join('.')}(${JSON.stringify(request.parameters)})`
}

export const createJavascriptResponse = createJsonResponse
