import { snakeCase } from 'change-case'

import type { CodeSampleDefinition } from './schema.js'

export const createPythonRequest = (
  request: CodeSampleDefinition['request'],
): string => {
  const parts = request.path.split('/')
  const params = Object.entries(request.parameters)
    .map(([key, value]) => `${snakeCase(key)}=${JSON.stringify(value)}`)
    .join(', ')

  return `seam${parts.map((p) => snakeCase(p)).join('.')}(${params})`
}

export const createPythonResponse = (
  response: CodeSampleDefinition['response'],
): string => {
  const { body } = response
  if (body == null) return 'None'
  return JSON.stringify(body)
}
