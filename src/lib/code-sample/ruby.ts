import { pascalCase, snakeCase } from 'change-case'

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

  const responseRubyClassName = pascalCase(responseKey)

  return Array.isArray(responseValue)
    ? formatRubyArrayResponse(responseValue, responseRubyClassName, title)
    : formatRubyResponse(responseValue, responseRubyClassName)
}

const formatRubyArrayResponse = (
  responseArray: Json[],
  responseRubyClassName: string,
  title: string,
): string => {
  const formattedItems = responseArray
    .map((item) => {
      if (item == null) {
        throw new Error(`Null value in response array for '${title}'`)
      }
      return formatRubyResponse(item, responseRubyClassName)
    })
    .join(',\n')

  return `[${formattedItems}]`
}

const formatRubyResponse = (
  responseParams: NonNullJson,
  responseRubyClassName: string,
): string => {
  const params = formatRubyArgs(responseParams)
  return `<Seam::${responseRubyClassName}:0x00000\n${params}>`
}

const formatRubyArgs = (jsonParams: NonNullJson): string =>
  Object.entries(jsonParams as Record<string, Json>)
    .map(
      ([paramKey, paramValue]) =>
        `${snakeCase(paramKey)}=${formatRubyValue(paramValue)}`,
    )
    .join('\n')
