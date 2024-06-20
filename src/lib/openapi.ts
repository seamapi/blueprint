import { openapi } from '@seamapi/types/connect'

interface SchemaObject {
  properties?: Record<string, any>
}
type Schemas = Record<string, SchemaObject>

interface OperationDetails {
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
  type: string
}

interface Operation {
  method: string
  successfulResponse: SuccessfulResponse | null
}

interface ApiPath {
  path: string
  operations: Operation[]
}

export interface Openapi {
  info: {
    title: string
  }
  schemas: Schema[]
  apiPaths: ApiPath[]
}

const extractSchemas = (schemas: Schemas): Schema[] => {
  return Object.entries(schemas).map(([schemaName, schema]) => ({
    name: schemaName,
    properties: schema.properties != null ? Object.keys(schema.properties) : [],
  }))
}

const extractPaths = (paths: Paths): ApiPath[] => {
  return Object.entries(paths).map(([path, operations]) => ({
    path,
    operations: Object.entries(operations).map(([method, operationDetails]) => {
      let successfulResponse: SuccessfulResponse | null = null

      if (operationDetails.responses?.['200'] !== undefined) {
        const response = operationDetails.responses['200']
        const description =
          typeof response.description === 'string' ? response.description : ''
        const schemaProperties =
          response.content?.['application/json']?.schema?.properties ?? {}

        successfulResponse = {
          description,
          schemaProperties,
          type: response.content['application/json'].schema.type,
        }
      }

      return {
        method: method.toUpperCase(),
        successfulResponse,
      }
    }),
  }))
}

export const extractOpenapi = (): Openapi => {
  const { components, paths, info } = openapi

  const schemas = extractSchemas(components.schemas as Schemas)
  const apiPaths = extractPaths(paths as Paths)

  return {
    info: {
      title: info.title,
    },
    schemas,
    apiPaths,
  }
}
