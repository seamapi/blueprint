import { snakeCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import type { CodeSampleDefinition, Context } from './schema.js'

export const createRubyRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const params = Object.entries(request.parameters)
    .map(([key, value]) => `${snakeCase(key)}: ${formatRubyValue(value)}`)
    .join(', ')

  return `seam${parts.map((p) => snakeCase(p)).join('.')}(${params})`
}

const formatRubyValue = (value: Json): string =>
  value == null ? 'nil' : JSON.stringify(value)

export const createRubyResponse = (
  { response, title }: CodeSampleDefinition,
  context: Context,
): string => {
  const { endpoint } = context

  if (endpoint.response.responseType === 'void') return 'nil'

  const { responseKey } = endpoint.response
  const responseValue = response?.body?.[responseKey]

  if (responseValue == null) {
    throw new Error(`Missing ${responseKey} for '${title}'`)
  }

  return Array.isArray(responseValue)
    ? formatRubyArrayResponse(responseValue, title)
    : formatRubyResponse(responseValue)
}

const formatRubyArrayResponse = (
  responseArray: Json[],
  title: string,
): string => {
  const formattedItems = responseArray
    .map((item) => {
      if (item == null) {
        throw new Error(`Null value in response array for '${title}'`)
      }
      return formatRubyResponse(item)
    })
    .join(',\n')

  return `[${formattedItems}]`
}

const formatRubyResponse = (responseParams: NonNullJson): string => {
  const values = Object.entries(responseParams as Record<string, Json>)
    .map(
      ([paramKey, paramValue]) =>
        `"${snakeCase(paramKey)}" => ${formatRubyValue(paramValue)}`,
    )
  return `{${values.join('\n')}}`
}
