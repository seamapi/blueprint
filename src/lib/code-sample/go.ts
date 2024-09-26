import { pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import { createJsonResponse } from './create-json-response.js'
import type { CodeSampleDefinition, Context } from './schema.js'

interface GoPackageConfig {
  readonly pathsWithCustomPackageName: readonly string[]
  readonly defaultPackageName: string
}

const GO_PACKAGE_CONFIG: GoPackageConfig = {
  pathsWithCustomPackageName: [
    '/acs',
    '/access_codes/simulate',
    '/access_codes/unmanaged',
    '/devices/simulate',
    '/devices/unmanaged',
    '/noise_sensors/noise_thresholds',
    '/noise_sensors/simulate',
    '/phones/simulate',
    '/user_identities/enrollment_automations',
    // TODO: thermostats
  ],
  defaultPackageName: 'api',
}

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
    shouldIncludeDefaultImport:
      isReqWithParams || goPackageName === GO_PACKAGE_CONFIG.defaultPackageName,
  })

  const requestStructName = getRequestStructName(request.path)

  const formattedParams = formatGoArgs(request.parameters)

  const goSdkRequestArgs = `context.Background()${isReqWithParams ? `, ${goPackageName}.${requestStructName}(${formattedParams})` : ''}`

  return `${goSdkImports}

  client${parts.map((p) => pascalCase(p)).join('.')}(${goSdkRequestArgs})
  `
}

const getGoPackageName = (path: string): string => {
  if (
    !GO_PACKAGE_CONFIG.pathsWithCustomPackageName.some((p) =>
      path.startsWith(p),
    )
  ) {
    return GO_PACKAGE_CONFIG.defaultPackageName
  }

  const parts = path.split('/').filter(Boolean)
  const firstPart = parts[1]

  if (firstPart == null) {
    throw new Error(`Invalid path: missing second part in "${path}"`)
  }

  return `${firstPart.replace(/_/g, '')}`
}

const generateImports = ({
  goPackageName,
  goPackageBasePath,
  shouldIncludeDefaultImport,
}: {
  goPackageName: string
  goPackageBasePath: string
  shouldIncludeDefaultImport: boolean
}): string => {
  const goPackageDefaultImport = `import ${GO_PACKAGE_CONFIG.defaultPackageName} "${goPackageBasePath}"`
  const shouldImportNestedPackage =
    goPackageName !== GO_PACKAGE_CONFIG.defaultPackageName
  const goPackageNestedPackageImport = `import ${goPackageName} "${goPackageBasePath}/${goPackageName}"`

  return `${shouldIncludeDefaultImport ? goPackageDefaultImport : ''}
  ${shouldImportNestedPackage ? goPackageNestedPackageImport : ''}`.trim()
}

const getRequestStructName = (path: string): string => {
  const requestStructNameSuffix = 'Request'

  if (
    GO_PACKAGE_CONFIG.pathsWithCustomPackageName.some((p) => path.startsWith(p))
  ) {
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
