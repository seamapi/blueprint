import { pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'
import type { CodeSampleDefinition, Context } from './schema.js'
import { createJsonResponse } from './create-json-response.js'

interface GoPackageConfig {
  readonly pathsWithCustomPackageName: ReadonlyArray<string>
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
  const params = formatGoArgs(request.parameters ?? {})
  const isReqWithParams = Object.keys(request.parameters).length !== 0
  const packageName = getGoPackageName(request.path)
  const requestStructName = getRequestStructName(request.path)
  const goSdkRequestArgs = `context.Background()${isReqWithParams ? `, ${packageName}.${requestStructName}(${params})` : ''}`

  return `client${parts.map((p) => pascalCase(p)).join('.')}(${goSdkRequestArgs})`
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

  if (!firstPart) {
    throw new Error(`Invalid path: missing first part in "${path}"`)
  }

  return `${GO_PACKAGE_CONFIG.defaultPackageName}.${firstPart.replace(/_/g, '')}`
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
  Object.entries(jsonParams)
    .map(([paramKey, paramValue]) => {
      const formattedValue = formatGoValue(paramValue)
      return `${pascalCase(paramKey)}: ${formattedValue}`
    })
    .join(', ')

const formatGoValue = (value: Json): string => {
  switch (typeof value) {
    case 'string':
      return `api.String("${value}")`
    case 'boolean':
      return `api.Bool(${value})`
    case 'number':
      return `api.Float64(${value})`
    case 'object':
      if (value == null) return 'nil'

      if (Array.isArray(value)) {
        const formattedItems = value.map(formatGoValue)
        return `[]{${formattedItems.join(', ')}}`
      }
      const formattedEntries = Object.entries(value)
        .map(([key, val]) => `${pascalCase(key)}: ${formatGoValue(val)}`)
        .join(', ')
      return `interface{}{${formattedEntries}}`
    default:
      throw new Error(`Unsupported type: ${typeof value}`)
  }
}

export const createGoResponse = createJsonResponse
