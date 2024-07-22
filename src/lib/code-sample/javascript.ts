import { camelCase } from 'change-case'

import type { CodeSampleDefinition } from './schema.js'

export const createJavascriptRequest = (
  request: CodeSampleDefinition['request'],
): string => {
  const parts = request.path.split('/')
  return `await seam.${parts.map((p) => camelCase(p)).join('.')}(${JSON.stringify(request.parameters)})`
}

export const createJavascriptResponse = (
  response: CodeSampleDefinition['response'],
): string => {
  if (response == null) return 'void'
  return JSON.stringify(response.body)
}
