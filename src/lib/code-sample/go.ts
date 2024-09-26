import { pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import { createJsonResponse } from './create-json-response.js'
import type { CodeSampleDefinition, Context } from './schema.js'

const DEFAULT_GO_PACKAGE_NAME = 'api'

export const createGoRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const isReqWithParams = Object.keys(request.parameters).length !== 0

  const goPackageName = getGoPackageName(request.path)
  const goPackageBasePath = 'github.com/seamapi/go'

  const goSdkImports = generateImports({
    goPackageName,
    goPackageBasePath,
    isReqWithParams,
  })

  const requestStructName = getRequestStructName(request.path)

  const formattedParams = formatGoArgs(request.parameters)

  const goSdkRequestArgs = `context.Background()${isReqWithParams ? `, ${goPackageName}.${requestStructName}(${formattedParams})` : ''}`

  return `${goSdkImports}

  client${parts.map((p) => pascalCase(p)).join('.')}(${goSdkRequestArgs})
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

  return `${firstPathPart.replace(/_/g, '')}`
}

const isPathNested = (path: string): boolean =>
  path.split('/').slice(1).length > 2

const generateImports = ({
  goPackageName,
  goPackageBasePath,
  isReqWithParams,
}: {
  goPackageName: string
  goPackageBasePath: string
  isReqWithParams: boolean
}): string => {
  const goPackageDefaultImport = `import ${DEFAULT_GO_PACKAGE_NAME} "${goPackageBasePath}"`
  const shouldImportNestedPackage =
    goPackageName !== DEFAULT_GO_PACKAGE_NAME && isReqWithParams
  const goPackageNestedPackageImport = `import ${goPackageName} "${goPackageBasePath}/${goPackageName}"`

  return `${isReqWithParams ? goPackageDefaultImport : ''}
  ${shouldImportNestedPackage ? goPackageNestedPackageImport : ''}`.trim()
}

const getRequestStructName = (path: string): string => {
  const requestStructNameSuffix = 'Request'

  if (isPathNested(path)) {
    return `${pascalCase(removeUntilSecondSlash(path))}${requestStructNameSuffix}`
  }

  return `${pascalCase(path)}${requestStructNameSuffix}`
}

const removeUntilSecondSlash = (str: string): string =>
  str.replace(/^\/[^/]*/, '')

const formatGoArgs = (jsonParams: NonNullJson): string =>
  Object.entries(jsonParams as Record<string, Json>)
    .map(([paramKey, paramValue]) => {
      const formattedValue = formatGoValue(paramValue)
      return `${pascalCase(paramKey)}: ${formattedValue}`
    })
    .join(', ')

const formatGoValue = (value: Json): string => {
  if (value == null) return 'nil'
  if (typeof value === 'string') return `api.String("${value}")`
  if (typeof value === 'boolean') return `api.Bool(${value})`
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

export const createGoResponse = createJsonResponse
