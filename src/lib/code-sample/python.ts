import { pascalCase, snakeCase } from 'change-case'

import type { NonNullJson } from 'lib/json.js'

import type { CodeSampleDefinition, Context } from './schema.js'

const responseKeyToPythonResourceNameMap: Readonly<Record<string, string>> = {
  event: 'SeamEvent',
}

export const createPythonRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const params = formatPythonArgs(request.parameters)

  return `seam${parts.map((p) => snakeCase(p)).join('.')}(${params})`
}

const formatPythonArgs = (jsonParams: NonNullJson): string =>
  Object.entries(jsonParams)
    .map(([paramKey, paramValue]) => {
      const formattedValue =
        paramValue == null ? 'None' : JSON.stringify(paramValue)

      return `${snakeCase(paramKey)}=${formattedValue}`
    })
    .join(', ')

export const createPythonResponse = (
  { response, title }: CodeSampleDefinition,
  context: Context,
): string => {
  const { endpoint } = context

  if (endpoint.response.responseType === 'void') return 'None'

  const { responseKey, resourceType } = endpoint.response
  const responseValue = response?.body?.[responseKey]

  if (responseValue == null) {
    throw new Error(`Missing ${responseKey} for '${title}'`)
  }

  const responsePythonClassName = pascalCase(
    responseKeyToPythonResourceNameMap[resourceType] ?? resourceType,
  )

  return Array.isArray(responseValue)
    ? `[${responseValue
        .map((v) => {
          if (v == null) {
            throw new Error(`Null value in response array for '${title}'`)
          }
          return formatPythonResponse(v, responsePythonClassName)
        })
        .join(', ')}]`
    : formatPythonResponse(responseValue, responsePythonClassName)
}

const formatPythonResponse = (
  responseParams: NonNullJson,
  responsePythonClassName: string,
): string => {
  const params = formatPythonArgs(responseParams)
  return `${responsePythonClassName}(${params})`
}
