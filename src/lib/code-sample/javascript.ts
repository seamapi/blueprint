import { camelCase } from 'change-case'

import { createJsonResponse } from './create-json-response.js'
import type { CodeSampleDefinition, Context } from './schema.js'

export const createJavascriptRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const isWithoutParams = Object.keys(request.parameters).length === 0
  const formattedParams = isWithoutParams
    ? ''
    : JSON.stringify(request.parameters)

  return `await seam${parts.map((p) => camelCase(p)).join('.')}(${formattedParams})`
}

export const createJavascriptResponse = createJsonResponse
