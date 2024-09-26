import { pascalCase } from 'change-case'

import type { Json, NonNullJson } from 'lib/json.js'

import type { CodeSampleDefinition, Context } from './schema.js'
import { createJsonResponse } from './create-json-response.js'

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

const pathsWithCustomGoPackageName = [
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
]

const DEFAULT_GO_PACKAGE_NAME = 'api'

const getGoPackageName = (path: string): string => {
  if (!pathsWithCustomGoPackageName.some((p) => path.startsWith(p))) {
    return DEFAULT_GO_PACKAGE_NAME
  }

  const parts = path.split('/').filter(Boolean)
  const firstPart = parts[1]

  if (!firstPart) {
    throw new Error('Invalid path: missing first part')
  }

  return `${DEFAULT_GO_PACKAGE_NAME}.${firstPart.replace(/_/g, '')}`
}

const getRequestStructName = (path: string): string => {
  const requestStructNameSuffix = 'Request'

  if (pathsWithCustomGoPackageName.some((p) => path.startsWith(p))) {
    return (
      `${pascalCase(removeUntilSecondSlash(path))}` + requestStructNameSuffix
    )
  }

  return `${pascalCase(path)}` + requestStructNameSuffix
}

function removeUntilSecondSlash(str: string): string {
  return str.replace(/^\/[^/]*/, '')
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

export const createGoResponse = createJsonResponse
