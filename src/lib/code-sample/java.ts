import { camelCase, pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import { createJsonResponse } from './json.js'
import type { CodeSampleDefinition, Context } from './schema.js'

interface JavaRequestBuilderOptions {
  path: string
  parameters: NonNullJson
}

export const createJavaRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const pathParts = request.path.split('/').slice(1)
  const requestBuilderOptions: JavaRequestBuilderOptions = {
    path: request.path,
    parameters: request.parameters,
  }
  const clientArgs = createJavaRequestBuilder(requestBuilderOptions)

  return `seam.${pathParts.map((p) => camelCase(p)).join('().')}(${clientArgs});`
}

const createJavaRequestBuilder = ({
  path,
  parameters,
}: JavaRequestBuilderOptions): string => {
  const requestBuilderName = getRequestBuilderName(path)
  const isReqWithParams = Object.keys(parameters).length !== 0

  if (!isReqWithParams) return ''

  const formattedParams = formatJavaArgs(parameters)
  return `${requestBuilderName}.builder()${formattedParams}.build()`
}

const getRequestBuilderName = (path: string): string => {
  const requestBuilderNameSuffix = 'Request'
  const pathParts = path.split('/').slice(1)

  return isPathNested(pathParts)
    ? `${pascalCase(pathParts.slice(1).join('_'))}${requestBuilderNameSuffix}`
    : `${pascalCase(path)}${requestBuilderNameSuffix}`
}

const isPathNested = (pathParts: string[]): boolean => pathParts.length > 2

const formatJavaArgs = (jsonParams: NonNullJson): string =>
  Object.entries(jsonParams as Record<string, Json>)
    .map(([paramKey, paramValue]) => {
      const formattedValue = formatJavaValue(paramValue)
      return `.${camelCase(paramKey)}(${formattedValue})`
    })
    .join('\n')

const formatJavaValue = (value: Json): string => {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return `"${value}"`
  if (Array.isArray(value)) {
    const formattedItems = value.map(formatJavaValue).join(', ')
    return `List.of(${formattedItems})`
  }
  if (typeof value === 'object') {
    const formattedEntries = Object.entries(value)
      .map(([key, val]) => `"${key}", ${formatJavaValue(val)}`)
      .join(', ')
    return `Map.of(${formattedEntries})`
  }
  throw new Error(`Unsupported type: ${typeof value}`)
}

export const createJavaResponse = createJsonResponse
