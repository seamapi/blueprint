import { pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import type { CodeSampleDefinition, Context } from './schema.js'

const defaultGoPackageName = 'api'
const goPackageBasePath = 'github.com/seamapi/go'

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
  const formattedArgs = formatGoRequestArgs(request.parameters, {
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

interface GoContext {
  goPackageName: string
  requestStructName: string
}

const formatGoRequestArgs = (
  jsonParams: NonNullJson,
  context: GoContext,
): string =>
  Object.entries(jsonParams as Record<string, Json>)
    .map(([paramKey, paramValue]) => {
      const formattedValue = formatGoRequestArgValue(
        paramKey,
        paramValue,
        context,
      )
      return `${pascalCase(paramKey)}: ${formattedValue}`
    })
    .join(', ')

const formatGoRequestArgValue = (
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
    return formatGoRequestArrayValue(key, value, context)
  }

  if (typeof value === 'object') {
    return formatGoRequestObjectValue(key, value, context)
  }

  throw new Error(`Unsupported type: ${typeof value}`)
}

const formatGoRequestArrayValue = (
  key: string,
  value: Json[],
  context: GoContext,
): string => {
  if (value.length === 0) {
    // in Go there's no way define an empty array without specifying type
    // and code samples definitions don't include the type annotations
    return 'nil'
  }

  const formattedItems = value.map((v) =>
    formatGoRequestArgValue(key, v, context),
  )
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

const formatGoRequestObjectValue = (
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
        `${pascalCase(objKey)}: ${formatGoRequestArgValue(objKey, val, context)}`,
    )
    .join(', ')

  const { goPackageName, requestStructName } = context

  return `${goPackageName}.${pascalCase(`${requestStructName} ${key}`)}{${formattedEntries}}`
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

  const responseResourceGoStructName = pascalCase(resourceType)

  return Array.isArray(responseValue)
    ? formatGoArrayResponse(
        {
          responseArray: responseValue,
          responseResourceGoStructName,
          title,
        },
        context,
      )
    : formatGoResponse(responseValue, responseResourceGoStructName, context)
}

const formatGoArrayResponse = (
  {
    responseArray,
    responseResourceGoStructName,
    title,
  }: {
    responseArray: Json[]
    responseResourceGoStructName: string
    title: string
  },
  context: Context,
): string => {
  const formattedItems = responseArray
    .map((v) => {
      if (v == null) {
        throw new Error(`Null value in response array for '${title}'`)
      }
      return formatGoResponse(v, responseResourceGoStructName, context)
    })
    .join(', ')

  return `[]${defaultGoPackageName}.${responseResourceGoStructName}{${formattedItems}}`
}

const formatGoResponse = (
  responseParams: NonNullJson,
  responseResourceGoStructName: string,
  context: Context,
): string => {
  const params = formatGoResponseParams(responseParams, context)
  return `${defaultGoPackageName}.${responseResourceGoStructName}{${params}}`
}

const formatGoResponseParams = (
  jsonParams: NonNullJson,
  context: Context,
): string =>
  Object.entries(jsonParams as Record<string, Json>)
    .map(([paramKey, paramValue]) => {
      const formattedValue = formatGoResponseParamValue(
        {
          key: paramKey,
          value: paramValue,
          propertyChain: [],
        },
        context,
      )
      return `${pascalCase(paramKey)}: ${formattedValue}`
    })
    .join(', ')

const formatGoResponseParamValue = (
  {
    key,
    value,
    propertyChain,
  }: { key: string; value: Json; propertyChain: string[] },
  context: Context,
): string => {
  if (value === null) return 'nil'
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return `"${value}"`

  if (Array.isArray(value)) {
    return formatGoResponseArrayValue({ key, value, propertyChain }, context)
  }

  if (typeof value === 'object') {
    return formatGoResponseObjectValue({ key, value, propertyChain }, context)
  }

  throw new Error(`Unsupported type: ${typeof value}`)
}

const formatGoResponseArrayValue = (
  {
    key,
    value,
    propertyChain,
  }: { key: string; value: Json[]; propertyChain: string[] },
  context: Context,
): string => {
  if (value.length === 0) {
    return 'nil'
  }

  const item = value[0]
  if (item == null) {
    throw new Error(`Null value in response array for '${key}'`)
  }

  const updatedPropertyChain = [...propertyChain, key]

  if (isPrimitiveValue(item)) {
    const arrayType = getPrimitiveTypeName(item)
    const formattedItems = value
      .map((v) =>
        formatGoResponseParamValue(
          {
            key,
            value: v,
            propertyChain: updatedPropertyChain,
          },
          context,
        ),
      )
      .join(', ')
    return `[]${arrayType}{${formattedItems}}`
  } else {
    const formattedItems = value
      .map((v) =>
        formatGoResponseParamValue(
          {
            key,
            value: v,
            propertyChain: updatedPropertyChain,
          },
          context,
        ),
      )
      .join(', ')
    const structName = getStructName(updatedPropertyChain, context)

    return `[]${structName}{${formattedItems}}`
  }
}

const formatGoResponseObjectValue = (
  {
    key,
    value,
    propertyChain,
  }: { key: string; value: Record<string, Json>; propertyChain: string[] },
  context: Context,
): string => {
  if (Object.keys(value).length === 0) {
    return 'struct{}{}'
  }

  const updatedPropertyChain = [...propertyChain, key]
  const structName = getStructName(updatedPropertyChain, context)

  const formattedEntries = Object.entries(value)
    .map(
      ([objKey, val]) =>
        `${pascalCase(objKey)}: ${formatGoResponseParamValue(
          {
            key: objKey,
            value: val,
            propertyChain: updatedPropertyChain,
          },
          context,
        )}`,
    )
    .join(', ')

  return `${defaultGoPackageName}.${structName}{${formattedEntries}}`
}

const getStructName = (propertyChain: string[], context: Context): string => {
  const { endpoint } = context

  let resourceType
  if (endpoint.response.responseType !== 'void') {
    resourceType = endpoint.response.resourceType
  }

  const fullPropertyChain = [resourceType, ...propertyChain]
  return pascalCase(fullPropertyChain.filter(Boolean).join('_'))
}
