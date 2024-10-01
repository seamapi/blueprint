import { pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import { createJsonResponse } from './json.js'
import type { CodeSampleDefinition, Context } from './schema.js'

const defaultGoPackageName = 'api'
const goPackageBasePath = 'github.com/seamapi/go'

export const createGoRequest = (
  { request }: CodeSampleDefinition,
  context: Context,
): string => {
  const isReqWithParams = Object.keys(request.parameters).length !== 0
  const goPackageName = getGoPackageName(request.path)

  const goSdkImports = generateImports({
    goPackageName,
    isReqWithParams,
  })

  const requestStructName = getRequestStructName(request.path)
  const formattedArgs = formatGoArgs(request.parameters, {
    ...context,
    goPackageName,
    requestStructName,
  })
  const goSdkRequestArgs = `context.Background()${isReqWithParams ? `, ${goPackageName}.${requestStructName}(${formattedArgs})` : ''}`

  const pathParts = request.path.split('/')

  return `${goSdkImports}

  client${pathParts.map((p) => pascalCase(p)).join('.')}(${goSdkRequestArgs})
  `.trim()
}

const getGoPackageName = (path: string): string => {
  if (!isPathNested(path)) {
    return defaultGoPackageName
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
    const defaultPackageImport = `import ${defaultGoPackageName} "${goPackageBasePath}"`
    imports.push(defaultPackageImport)
  }

  if (goPackageName !== defaultGoPackageName && isReqWithParams) {
    const nestedPackageImport = `import ${goPackageName} "${goPackageBasePath}/${goPackageName}"`
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

interface GoContext extends Context {
  goPackageName: string
  requestStructName: string
}

const formatGoArgs = (jsonParams: NonNullJson, context: GoContext): string =>
  Object.entries(jsonParams as Record<string, Json>)
    .map(([paramKey, paramValue]) => {
      const formattedValue = formatGoValue(paramKey, paramValue, context)
      return `${pascalCase(paramKey)}: ${formattedValue}`
    })
    .join(', ')

const formatGoValue = (
  key: string,
  value: Json,
  context: GoContext,
): string => {
  if (value == null) return 'nil'
  if (typeof value === 'string')
    return `${defaultGoPackageName}.String("${value}")`
  if (typeof value === 'boolean')
    return `${defaultGoPackageName}.Bool(${value})`
  if (typeof value === 'number')
    return `${defaultGoPackageName}.Float64(${value})`

  if (Array.isArray(value)) {
    return formatGoArray(key, value, context)
  }

  if (typeof value === 'object') {
    return formatGoObject(key, value, context)
  }

  throw new Error(`Unsupported type: ${typeof value}`)
}

const formatGoArray = (
  key: string,
  value: Json[],
  context: GoContext,
): string => {
  if (value.length === 0) {
    // in Go there's no way define an empty array without specifying type
    // and code samples definitions don't include the type annotations
    return 'nil'
  }

  const formattedItems = value.map((v) => formatGoValue(key, v, context))
  const item = value[0]
  if (item == null) {
    throw new Error(`Null value in response array for '${key}'`)
  }

  const { goPackageName, requestStructName } = context

  const arrayType = isPrimitiveValue(item)
    ? getPrimitiveTypeName(item)
    : `${goPackageName}.${pascalCase(`${requestStructName} ${key}`)}Item`

  return `[${value.length}]${arrayType}{${formattedItems.join(', ')}}`
}

const isPrimitiveValue = (value: Json): value is string | number | boolean =>
  typeof value !== 'object' && value !== null

const getPrimitiveTypeName = (value: string | number | boolean): string => {
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'float64'
    case 'boolean':
      return 'bool'
  }
}

const formatGoObject = (
  key: string,
  value: Record<string, Json>,
  context: GoContext,
): string => {
  if (Object.keys(value).length === 0) {
    return 'struct{}{}'
  }

  const formattedEntries = Object.entries(value)
    .map(
      ([objKey, val]) =>
        `${pascalCase(objKey)}: ${formatGoValue(objKey, val, context)}`,
    )
    .join(', ')

  const { goPackageName, requestStructName } = context

  return `${goPackageName}.${pascalCase(`${requestStructName} ${key}`)}{${formattedEntries}}`
}

export const createGoResponse = createJsonResponse
