/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { writeFile } from "node:fs/promises"

import { openapi } from "@seamapi/types/connect"

interface SchemaObject {
  properties?: Record<string, any> 
}
type Schemas = Record<string, SchemaObject>

interface OperationDetails {
  operationId?: string
  responses?: Record<string, any>
}
type Operations = Record<string, OperationDetails>
type Paths = Record<string, Operations>

interface Schema {
  name: string
  properties: string[]
}

interface SuccessfulResponse {
  description: string
  schemaProperties: string[]
}

interface Operation {
  method: string
  operationId: string
  successfulResponse: SuccessfulResponse | null
}

interface ApiPath {
  path: string
  operations: Operation[]
}

export interface Openapi {
  info: {
    title: string
    version: string
  }
  schemas: Schema[]
  apiPaths: ApiPath[]
}

const extractSchemas = (schemas: Schemas): Schema[] => {
  return Object.entries(schemas).map(([schemaName, schema]) => ({
    name: schemaName,
    properties: schema.properties ? Object.keys(schema.properties) : [],
  }))
}

const extractPaths = (paths: Paths): ApiPath[] => {
  return Object.entries(paths).map(([path, operations]) => ({
    path,
    operations: Object.entries(operations).map(([method, operationDetails]) => {
      let successfulResponse: SuccessfulResponse | null = null

      if (operationDetails.responses?.['200']) {
        const response = operationDetails.responses['200']
        const description = response.description || ''
        const schemaProperties = response.content?.["application/json"]?.schema?.properties
          ? Object.keys(response.content["application/json"].schema.properties)
          : []

        successfulResponse = {
          description,
          schemaProperties,
        }
      }

      return {
        method: method.toUpperCase(),
        operationId: operationDetails.operationId || '',
        successfulResponse,
      }
    })
  }))
}

const extractOpenapi = (): Openapi => {
  const { components, paths, info } = openapi

  const schemas = extractSchemas(components.schemas as Schemas) 
  const apiPaths = extractPaths(paths as Paths) 

  return {
    info: {
      title: info.title,
      version: info.version,
    },
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