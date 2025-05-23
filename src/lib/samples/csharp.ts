import { camelCase, pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import type { CodeSampleContext, CodeSampleDefinition } from './code-sample.js'
import { createJsonResponse } from './json.js'

export const createCsharpRequest = (
  { request }: CodeSampleDefinition,
  _context: CodeSampleContext,
): string => {
  const parts = request.path.split('/').slice(1)
  const requestArgs = formatCsharpArgs(request.parameters)

  return `seam.${parts.map((p) => pascalCase(p)).join('.')}(${requestArgs})`
}

const formatCsharpArgs = (jsonParams: NonNullJson): string =>
  Object.entries(jsonParams as Record<string, Json>)
    .map(([key, value]) => {
      const formattedValue = formatCsharpValue(key, value)
      return `${camelCase(key)}: ${formattedValue}`
    })
    .join(', ')

const formatCsharpValue = (key: string, value: Json): string => {
  if (value == null) return 'null'
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return `"${value}"`
  if (Array.isArray(value)) {
    return formatCsharpArray(key, value)
  }
  if (typeof value === 'object') {
    return formatCsharpObject(value)
  }
  throw new Error(`Unsupported type: ${typeof value}`)
}

const formatCsharpArray = (key: string, value: Json[]): string => {
  if (value.length === 0) {
    return 'new object[] { }'
  }

  const formattedItems = value.map((v) => formatCsharpValue(key, v))
  const item = value[0]
  if (item == null) {
    throw new Error(`Null value in response array for '${key}'`)
  }

  const arrayType = isPrimitiveValue(item)
    ? getPrimitiveTypeName(item)
    : 'object'

  return `new ${arrayType}[] { ${formattedItems.join(', ')}} `
}

const isPrimitiveValue = (value: Json): boolean =>
  value !== null && typeof value !== 'object'

const getPrimitiveTypeName = (value: Json): string => {
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'float'
    case 'boolean':
      return 'bool'
    default:
      throw new Error(`Unsupported type: ${typeof value}`)
  }
}

const formatCsharpObject = (value: Record<string, Json>): string => {
  if (Object.keys(value).length === 0) {
    return 'new { }'
  }

  const formattedEntries = Object.entries(value)
    .map(
      ([objKey, val]) =>
        `${camelCase(objKey)} = ${formatCsharpValue(objKey, val)}`,
    )
    .join(', ')

  return `new { ${formattedEntries} }`
}

export const createCsharpResponse = createJsonResponse
