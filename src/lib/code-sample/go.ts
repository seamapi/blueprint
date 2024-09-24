import { pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import type { CodeSampleDefinition, Context } from './schema.js'

export const createGoRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const params = formatGoArgs(request.parameters ?? {})
  const isReqWithParams = Object.keys(request.parameters).length !== 0

  return `client.${parts.map((p) => pascalCase(p)).join('.')}(context.Background()${isReqWithParams ? `, api.${pascalCase(parts.join('_'))}Request(${params})` : ''})`
}

const formatGoArgs = (jsonParams: NonNullJson): string =>
  Object.entries(jsonParams)
    .map(([paramKey, paramValue]) => {
      const formattedValue = formatGoValue(paramValue)
      return `${pascalCase(paramKey)}: ${formattedValue}`
    })
    .join(', ')

const formatGoValue = (value: Json): string => {
  if (value == null) return 'nil'
  if (typeof value === 'string') return `api.String("${value}")`
  if (typeof value === 'boolean') return `api.Bool(${value ? 'true' : 'false'})`
  if (typeof value === 'number') return `api.Float64(${value})`
  if (Array.isArray(value)) {
    const formattedItems = value.map(formatGoValue)
    return `[]{${formattedItems.join(', ')}}`
  }
  if (typeof value === 'object') {
    const formattedEntries = Object.entries(value)
      .map(([key, val]) => `${pascalCase(key)}: ${formatGoValue(val)}`)
      .join(', ')
    return `interface{}{${formattedEntries}}`
  }
  throw new Error(`Unsupported type: ${typeof value}`)
}

export const createGoResponse = (
  { response, title }: CodeSampleDefinition,
  context: Context,
): string => {
  const { endpoint } = context

  if (endpoint.response.responseType === 'void') return 'nil'

  const { responseKey, resourceType } = endpoint.response
  const responseValue = response?.body?.[responseKey]

  if (responseValue == null) {
    throw new Error(`Missing ${responseKey} for '${title}'`)
  }

  const responseGoStructName = pascalCase(resourceType)

  return Array.isArray(responseValue)
    ? formatGoArrayResponse(responseValue, responseGoStructName, title)
    : formatGoResponse(responseValue, responseGoStructName)
}

const formatGoArrayResponse = (
  responseArray: Json[],
  responseGoStructName: string,
  title: string,
): string => {
  const formattedItems = responseArray
    .map((v) => {
      if (v == null) {
        throw new Error(`Null value in response array for '${title}'`)
      }
      return formatGoResponse(v, responseGoStructName)
    })
    .join(', ')

  return `[]${responseGoStructName}{${formattedItems}}`
}

const formatGoResponse = (
  responseParams: NonNullJson,
  responseGoStructName: string,
): string => {
  const params = Object.entries(responseParams)
    .map(
      ([key, value]) => `${pascalCase(key)}: ${formatGoResponseValue(value)}`,
    )
    .join(', ')
  return `${responseGoStructName}{${params}}`
}

const formatGoResponseValue = (value: Json): any => {
  if (value == null) return 'nil'
  if (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value
  }
  if (Array.isArray(value)) {
    const formattedItems = value.map(formatGoResponseValue)
    return `[]{${formattedItems.join(', ')}}`
  }
  if (typeof value === 'object') {
    const formattedEntries = Object.entries(value)
      .map(([key, val]) => `${pascalCase(key)}: ${formatGoResponseValue(val)}`)
      .join(', ')
    return `interface{}{${formattedEntries}}`
  }
  throw new Error(`Unsupported type: ${typeof value}`)
}
