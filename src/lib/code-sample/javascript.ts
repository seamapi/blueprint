import { camelCase } from 'change-case'

import type { CodeSampleDefinition, Context } from './schema.js'

export const createJavascriptRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  return `await seam${parts.map((p) => camelCase(p)).join('.')}(${JSON.stringify(request.parameters)})`
}

export const createJavascriptResponse = (
  { response, title }: CodeSampleDefinition,
  context: Context,
): string => {
  const { endpoint } = context
  if (endpoint.response.responseType === 'void') return 'void'
  const { responseKey } = endpoint.response
  const data = response?.body?.[responseKey]
  if (data == null) {
    throw new Error(`Missing ${responseKey} for '${title}'`)
  }
  return JSON.stringify(data)
}
