import type { CodeSampleContext,CodeSampleDefinition } from './code-sample.js'
import type {
  ResourceSampleContext,
  ResourceSampleDefinition,
} from './resource-sample.js'

export const createJsonResponse = (
  { response, title }: CodeSampleDefinition,
  context: CodeSampleContext,
): string => {
  const { endpoint } = context
  if (endpoint.response.responseType === 'void') {
    return JSON.stringify({})
  }
  const { responseKey } = endpoint.response
  const data = response?.body?.[responseKey]
  if (data == null) {
    throw new Error(`Missing ${responseKey} for '${title}'`)
  }
  return JSON.stringify(data)
}

export const createJsonResourceData = (
  { properties }: ResourceSampleDefinition,
  _context: ResourceSampleContext,
): string => {
  return JSON.stringify(properties)
}
