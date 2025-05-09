import { camelCase } from 'change-case'

import type { CodeSampleContext, CodeSampleDefinition } from './code-sample.js'
import { createJsonResponse } from './json.js'

export const createJavascriptRequest = (
  { request }: CodeSampleDefinition,
  _context: CodeSampleContext,
): string => {
  const parts = request.path.split('/')
  const isWithoutParams = Object.keys(request.parameters).length === 0
  const formattedParams = isWithoutParams
    ? ''
    : JSON.stringify(request.parameters)

  return `await seam${parts.map((p) => camelCase(p)).join('.')}(${formattedParams})`
}

export const createJavascriptResponse = createJsonResponse
