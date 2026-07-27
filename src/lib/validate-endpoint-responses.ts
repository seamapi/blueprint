import { OpenapiOperationSchema } from './openapi/schemas.js'
import type {
  OpenapiOperation,
  OpenapiPaths,
  OpenapiSchema,
} from './openapi/types.js'

const schemaRefPrefix = '#/components/schemas/'

const getResponseResourceSchema = (
  operation: OpenapiOperation,
  responseKey: string,
): OpenapiSchema | undefined =>
  operation.responses['200']?.content?.['application/json']?.schema
    .properties?.[responseKey]

export const assertDocumentedEndpointResponsesReferenceResourceSchemas = (
  paths: OpenapiPaths,
  validResourceTypes: string[],
): void => {
  const validResourceTypeSet = new Set(validResourceTypes)
  const offenders: string[] = []

  for (const [path, pathItem] of Object.entries(paths)) {
    const operation = pathItem.post
    if (operation == null) continue

    const parsedOperation = OpenapiOperationSchema.parse(operation, {
      path: path.split('/'),
    })

    if (parsedOperation['x-undocumented'].length > 0) continue

    const responseKey = parsedOperation['x-response-key']
    if (responseKey == null) continue

    const responseSchema = getResponseResourceSchema(operation, responseKey)
    const ref = responseSchema?.$ref ?? responseSchema?.items?.$ref

    if (ref == null) {
      offenders.push(
        `${path} response key '${responseKey}' uses an inline schema instead of $ref`,
      )
      continue
    }

    if (!ref.startsWith(schemaRefPrefix)) {
      offenders.push(
        `${path} response key '${responseKey}' uses invalid resource reference '${ref}'`,
      )
      continue
    }

    const resourceType = ref.slice(schemaRefPrefix.length)
    if (
      resourceType.length === 0 ||
      resourceType.includes('/') ||
      !validResourceTypeSet.has(resourceType)
    ) {
      offenders.push(
        `${path} response key '${responseKey}' references unknown resource type '${resourceType}'`,
      )
    }
  }

  if (offenders.length > 0) {
    throw new Error(
      `Documented endpoint responses must reference a resource type using $ref. Found:\n${offenders.join('\n')}`,
    )
  }
}
