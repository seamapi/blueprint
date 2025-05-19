import type { CodeSampleContext, CodeSampleDefinition } from './code-sample.js'
import { createJsonResponse } from './json.js'

const BASE_URL = 'https://connect.getseam.com'

export const createCurlRequest = (
  { request }: CodeSampleDefinition,
  _context: CodeSampleContext,
): string => {
  const method = 'POST'
  const url = `${BASE_URL}${request.path}`

  let curlCommand = `curl -X ${method} "${url}" \\\n`
  curlCommand += `  -H "Authorization: Bearer $SEAM_API_KEY" \\\n`

  const params = request.parameters
  const hasParams = Object.keys(params).length > 0

  if (hasParams) {
    curlCommand += `  -H "Content-Type: application/json" \\\n`
    curlCommand += `  -d '${JSON.stringify(params)}'`
    console.log("🚀 ~ JSON.stringify(params):", JSON.stringify(params))
  } else {
    // Remove trailing backslash and newline if no params/data
    curlCommand = curlCommand.trimEnd().slice(0, -1).trimEnd()
  }

  return curlCommand
}

export const createCurlResponse = createJsonResponse
