import type { CodeSampleDefinition, Context } from './code-sample.js'

export const createJsonResponse = (
  { response, title }: CodeSampleDefinition,
  context: Context,
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
