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

const addInvalidResourceReferenceOffender = (
  offenders: string[],
  location: string,
  ref: string,
  validResourceTypes: Set<string>,
): void => {
  if (!ref.startsWith(schemaRefPrefix)) {
    offenders.push(`${location} uses invalid resource reference '${ref}'`)
    return
  }

  const resourceType = ref.slice(schemaRefPrefix.length)
  if (
    resourceType.length === 0 ||
    resourceType.includes('/') ||
    !validResourceTypes.has(resourceType)
  ) {
    offenders.push(
      `${location} references unknown resource type '${resourceType}'`,
    )
  }
}

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
    const batchKeys = parsedOperation['x-batch-keys']

    if (batchKeys != null) {
      for (const batchKey of batchKeys) {
        const ref = responseSchema?.properties?.[batchKey]?.items?.$ref

        if (ref == null) {
          offenders.push(
            `${path} batch key '${batchKey}' does not resolve using items.$ref`,
          )
          continue
        }

        addInvalidResourceReferenceOffender(
          offenders,
          `${path} batch key '${batchKey}'`,
          ref,
          validResourceTypeSet,
        )
      }
      continue
    }

    const ref = responseSchema?.$ref ?? responseSchema?.items?.$ref

    if (ref == null) {
      offenders.push(
        `${path} response key '${responseKey}' uses an inline schema instead of $ref`,
      )
      continue
    }

    addInvalidResourceReferenceOffender(
      offenders,
      `${path} response key '${responseKey}'`,
      ref,
      validResourceTypeSet,
    )
  }

  if (offenders.length > 0) {
    throw new Error(
      `Documented endpoint responses must reference a resource type using $ref. Found:\n${offenders.join('\n')}`,
    )
  }
}
