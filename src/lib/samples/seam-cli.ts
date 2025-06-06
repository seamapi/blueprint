import { kebabCase } from 'change-case'

import type { CodeSampleContext, CodeSampleDefinition } from './code-sample.js'
import { createJsonResourceData, createJsonResponse } from './json.js'

export const createSeamCliRequest = (
  { request }: CodeSampleDefinition,
  _context: CodeSampleContext,
): string => {
  const parts = request.path.split('/')
  const requestParams = Object.entries(request.parameters)
    .map(([key, value]) => `--${key} ${JSON.stringify(value)}`)
    .join(' ')

  return `seam${parts.map((p) => kebabCase(p)).join(' ')} ${requestParams}`
}

export const createSeamCliResponse = createJsonResponse

export const createSeamCliResourceData = createJsonResourceData
