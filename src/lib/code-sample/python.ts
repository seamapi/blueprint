import { pascalCase, snakeCase } from 'change-case'

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

  const bodyEntry = Object.entries(body)[0]
  if (bodyEntry == null) {
    return 'None'
  }

  const [responseKey, responseValue] = bodyEntry
  const responseClassName = pascalCase(responseKey)

  if (typeof responseValue !== 'object' || responseValue === null) {
    return 'None'
  }

  const responseParams = Object.entries(responseValue as Record<string, any>)
    .map(
      ([paramKey, paramValue]) =>
        `${snakeCase(paramKey)}=${JSON.stringify(paramValue)}`,
    )
    .join(', ')

  return `${responseClassName}(${responseParams})`
}
