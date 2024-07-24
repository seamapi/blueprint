import { pascalCase, snakeCase } from 'change-case'

import type { CodeSampleDefinition, Context } from './schema.js'

export const createPythonRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const params = Object.entries(request.parameters)
    .map(([key, value]) => `${snakeCase(key)}=${JSON.stringify(value)}`)
    .join(', ')

  return `seam${parts.map((p) => snakeCase(p)).join('.')}(${params})`
}

export const createPythonResponse = (
  { response, title }: CodeSampleDefinition,
  context: Context,
): string => {
  const { endpoint } = context

  if (endpoint.response.responseType === 'void') return 'None'

  const { responseKey } = endpoint.response
  const responseValue = response?.body?.[responseKey]

  if (responseValue == null) {
    throw new Error(`Missing ${responseKey} for '${title}'`)
  }

  const responsePythonClassName = pascalCase(
    responseKeyToPythonResourceNameMap[responseKey] ?? responseKey,
  )
  const responsePythonParams = Object.entries(responseValue)
    .map(
      ([paramKey, paramValue]) =>
        `${snakeCase(paramKey)}=${JSON.stringify(paramValue)}`,
    )
    .join(', ')

  return `${responsePythonClassName}(${responsePythonParams})`
}

const responseKeyToPythonResourceNameMap: Record<string, string> = {
  event: 'SeamEvent',
}
