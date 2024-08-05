import { pascalCase, snakeCase } from 'change-case'

import type { Json } from 'lib/json.js'

import type { CodeSampleDefinition, Context } from './schema.js'

export const createPythonRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const params = formatPythonArgs(request.parameters)

  return `seam${parts.map((p) => snakeCase(p)).join('.')}(${params})`
}

type NonNullJson = Exclude<Json, null>

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
    RESOURCE_TYPE_TO_PYTHON_CLASS_NAME[resourceType] ?? resourceType,
  )

  const formatPythonResponse = (value: NonNullJson): string => {
    const params = formatPythonArgs(value)
    return `${responsePythonClassName}(${params})`
  }

  const pythonResponse = Array.isArray(responseValue)
    ? `[${responseValue.map((v) => formatPythonResponse(v!)).join(', ')}]`
    : formatPythonResponse(responseValue)

  return pythonResponse
}

const formatPythonArgs = (jsonParams: NonNullJson): string =>
  Object.entries(jsonParams)
    .map(
      ([paramKey, paramValue]) =>
        `${snakeCase(paramKey)}=${JSON.stringify(paramValue)}`,
    )
    .join(', ')

const RESOURCE_TYPE_TO_PYTHON_CLASS_NAME: Readonly<Record<string, string>> = {
  event: 'SeamEvent',
}
