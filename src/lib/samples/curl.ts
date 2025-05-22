import type { CodeSampleContext, CodeSampleDefinition } from './code-sample.js'

const BASE_URL = 'https://connect.getseam.com'

export const createCurlRequest = (
  { request }: CodeSampleDefinition,
  _context: CodeSampleContext,
): string => {
  const method = 'POST'
  const url = `${BASE_URL}${request.path}`

  let curlCommand = `curl --request ${method} "${url}" \\\n`
  curlCommand += `  --header "Authorization: Bearer $SEAM_API_KEY" \\\n`

  const params = request.parameters
  const hasParams = Object.keys(params).length > 0

  if (hasParams) {
    curlCommand += `  --json '${JSON.stringify(params)}'`
  } else {
    // Remove trailing backslash and newline if no params
    curlCommand = curlCommand.trimEnd().slice(0, -1).trimEnd()
  }

  return curlCommand
}

export const createCurlResponse = (
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
  return JSON.stringify({ [responseKey]: data })
}
