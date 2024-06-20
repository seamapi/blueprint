import { writeFile } from "node:fs/promises"

import { openapi } from "@seamapi/types/connect"

export interface Openapi {
  info: {
    title: string
  }
}

const extractSchemas = (schemas) => {
  return Object.entries(schemas).map(([schemaName, schema]) => ({
    name: schemaName,
    properties: schema.properties ? Object.keys(schema.properties) : [],
  }))
}

const extractPaths = (paths) => {
  return Object.entries(paths).map(([path, operations]) => ({
    path,
    operations: Object.entries(operations).map(([method, operationDetails]) => ({
      method: method.toUpperCase(),
      summary: operationDetails.summary || '',
      operationId: operationDetails.operationId || '',
    })),
  }))
}

const extractOpenapi = (): Openapi => {
  const { components, paths } = openapi

  const schemas = extractSchemas(components.schemas)

  const apiPaths = extractPaths(paths)

  return {
    schemas,
    apiPaths,
  }
}

const extractedOpenapi = extractOpenapi()

const outputFilePath = './extractedOpenapi.json'
writeFile(outputFilePath, JSON.stringify(extractedOpenapi, null, 2))
  .then(() => console.log('Extracted Openapi data written to extractedOpenapi.json'))
  .catch((error) => console.error('Error writing extractedOpenapi:', error))

console.log(JSON.stringify(extractedOpenapi, null, 2))