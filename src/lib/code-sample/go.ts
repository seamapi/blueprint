import { pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import { createJsonResponse } from './create-json-response.js'
import type { CodeSampleDefinition, Context } from './schema.js'

const DEFAULT_GO_PACKAGE_NAME = 'api'
const GO_PACKAGE_BASE_PATH = 'github.com/seamapi/go'

export const createGoRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const isReqWithParams = Object.keys(request.parameters).length !== 0
  const goPackageName = getGoPackageName(request.path)

  const goSdkImports = generateImports({
    goPackageName,
    isReqWithParams,
  })

  const requestStructName = getRequestStructName(request.path)
  const formattedArgs = formatGoArgs(request.parameters)
  const goSdkRequestArgs = `context.Background()${isReqWithParams ? `, ${goPackageName}.${requestStructName}(${formattedArgs})` : ''}`

  const pathParts = request.path.split('/')

  return `${goSdkImports}

  client${pathParts.map((p) => pascalCase(p)).join('.')}(${goSdkRequestArgs})
  `.trim()
}

const getGoPackageName = (path: string): string => {
  if (!isPathNested(path)) {
    return DEFAULT_GO_PACKAGE_NAME
  }

  const firstPathPart = path.split('/').slice(1)[1]

  if (firstPathPart == null) {
    throw new Error(`Invalid path: missing second part in "${path}"`)
  }

  return firstPathPart.replace(/_/g, '')
}

const isPathNested = (path: string): boolean =>
  path.split('/').slice(1).length > 2

const generateImports = ({
  goPackageName,
  isReqWithParams,
}: {
  goPackageName: string
  isReqWithParams: boolean
}): string => {
  const imports: string[] = []

  if (isReqWithParams) {
    const defaultPackageImport = `import ${DEFAULT_GO_PACKAGE_NAME} "${GO_PACKAGE_BASE_PATH}"`
    imports.push(defaultPackageImport)
  }

  if (goPackageName !== DEFAULT_GO_PACKAGE_NAME && isReqWithParams) {
    const nestedPackageImport = `import ${goPackageName} "${GO_PACKAGE_BASE_PATH}/${goPackageName}"`
    imports.push(nestedPackageImport)
  }

  return imports.join('\n')
}

const getRequestStructName = (path: string): string => {
  const requestStructNameSuffix = 'Request'

  return isPathNested(path)
    ? `${pascalCase(removeUntilSecondSlash(path))}${requestStructNameSuffix}`
    : `${pascalCase(path)}${requestStructNameSuffix}`
}

const removeUntilSecondSlash = (str: string): string =>
  str.replace(/^\/[^/]*/, '')

const formatGoArgs = (jsonParams: NonNullJson): string =>
  Object.entries(jsonParams as Record<string, Json>)
    .map(([paramKey, paramValue]) => {
      const formattedValue = formatGoValue({ value: paramValue, key: paramKey })
      return `${pascalCase(paramKey)}: ${formattedValue}`
    })
    .join(', ')

const formatGoValue = ({
  value,
  key,
}: {
  value: Json
  key: string
}): string => {
  if (value == null) return 'nil'
  if (typeof value === 'string') return `api.String("${value}")`
  if (typeof value === 'boolean') return `api.Bool(${value})`
  if (typeof value === 'number') return `api.Float64(${value})`

  if (Array.isArray(value)) {
    return formatGoArray(value, key)
  }

  if (typeof value === 'object') {
    return formatGoObject(value, key)
  }

  throw new Error(`Unsupported type: ${typeof value}`)
}

const formatGoArray = (value: Json[], key: string): string => {
  if (value.length === 0) {
    return 'nil'
  }

  const formattedItems = value.map((v) => formatGoValue({ value: v, key }))
  const item = value[0]
  if (item == null) {
    throw new Error(`Null value in response array for '${key}'`)
  }

  const arrayType = isPrimitiveValue(item)
    ? getPrimitiveTypeName(item)
    : `api.${pascalCase(key)}`

  return `[${value.length}]${arrayType}{${formattedItems.join(', ')}}`
}

const formatGoObject = (value: Record<string, Json>, key: string): string => {
  if (Object.keys(value).length === 0) {
    return 'struct{}{}'
  }

  const formattedEntries = Object.entries(value)
    .map(
      ([objKey, val]) =>
        `${pascalCase(objKey)}: ${formatGoValue({ value: val, key: objKey })}`,
    )
    .join(', ')

  return `api.${pascalCase(key)}{${formattedEntries}}`
}

const isPrimitiveValue = (value: Json): boolean =>
  value != null && typeof value !== 'object'

const getPrimitiveTypeName = (value: Json): string => {
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'float64'
    case 'boolean':
      return 'bool'
    default:
      throw new Error(`Unsupported type: ${typeof value}`)
  }
}

export const createGoResponse = createJsonResponse
