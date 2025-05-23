import { snakeCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import type { CodeSampleContext, CodeSampleDefinition } from './code-sample.js'

export const createPhpRequest = (
  { request }: CodeSampleDefinition,
  _context: CodeSampleContext,
): string => {
  const parts = request.path.split('/')
  const requestParams = Object.entries(request.parameters)
    .map(([key, value]) => `${key}: ${formatPhpValue(value)}`)
    .join(',')

  return `<?php\n$seam${parts.map((p) => snakeCase(p)).join('->')}(${requestParams})`
}

export const createPhpResponse = (
  { response, title }: CodeSampleDefinition,
  context: CodeSampleContext,
): string => {
  const { endpoint } = context

  if (endpoint.response.responseType === 'void') return 'null'

  const { responseKey } = endpoint.response
  const responseValue = response?.body?.[responseKey]

  if (responseValue == null) {
    throw new Error(`Missing ${responseKey} for '${title}'`)
  }

  const formattedResponse = Array.isArray(responseValue)
    ? formatPhpArrayResponse(responseValue, title)
    : formatPhpResponse(responseValue)

  return `<?php\n${formattedResponse}`
}

const formatPhpArrayResponse = (
  responseArray: Json[],
  title: string,
): string => {
  const formattedItems = responseArray
    .map((item) => {
      if (item == null) {
        throw new Error(`Null value in response array for '${title}'`)
      }
      return formatPhpResponse(item)
    })
    .join(',\n')

  return `[${formattedItems}]`
}

const formatPhpResponse = (responseParams: NonNullJson): string => {
  const values = Object.entries(responseParams as Record<string, Json>).map(
    ([paramKey, paramValue]) =>
      `"${snakeCase(paramKey)}" => ${formatPhpValue(paramValue)}`,
  )
  return `[${values.join(',')}]`
}

const formatPhpValue = (value: Json): string => {
  if (value == null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return `"${value}"`
  if (Array.isArray(value)) {
    const formattedItems = value.map(formatPhpValue).join(', ')
    return `[${formattedItems}]`
  }
  if (typeof value === 'object') {
    const formattedEntries = Object.entries(value)
      .map(([key, val]) => `"${snakeCase(key)}" => ${formatPhpValue(val)}`)
      .join(', ')
    return `[${formattedEntries}]`
  }
  throw new Error(`Unsupported type: ${typeof value}`)
}
