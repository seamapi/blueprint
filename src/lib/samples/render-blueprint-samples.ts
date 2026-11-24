import type { Blueprint, Endpoint, Resource } from 'lib/blueprint.js'
import type { Json } from 'lib/json.js'
import {
  type Field,
  getEnumValues,
  isFieldOmitted,
  isLiteralOmitted,
  isVariantOmitted,
} from 'lib/omit.js'
import {
  flattenedDiscriminators,
  type IsOmitted,
  requestVisibility,
  type ResponseField,
  responseVisibility,
  taggedArrayProjections,
} from 'lib/visibility.js'

import { type CodeSampleDefinition, createCodeSample } from './code-sample.js'
import {
  createResourceSample,
  type ResourceSampleContext,
  type ResourceSampleDefinition,
} from './resource-sample.js'

type JsonObject = Record<string, Json>

const isObject = (value: Json): value is JsonObject =>
  value != null && typeof value === 'object' && !Array.isArray(value)

const hideDiscriminatedExample = (
  field: Field,
  fields: Field[],
  value: JsonObject,
  isOmitted: IsOmitted,
): boolean => {
  const discriminator = flattenedDiscriminators.get(field)
  const tag = fields.find(({ name }) => name === discriminator)
  return tag != null && isLiteralOmitted(tag, value[tag.name], isOmitted)
}

const omitExampleFields = (
  raw: JsonObject,
  fields: Field[],
  isOmitted: IsOmitted,
): JsonObject => {
  const byName = new Map(fields.map((field) => [field.name, field]))
  return Object.fromEntries(
    Object.entries(raw).flatMap(([name, value]) => {
      const field = byName.get(name)
      if (field == null) return [[name, value]]
      if (
        isFieldOmitted(field, isOmitted) ||
        isLiteralOmitted(field, value, isOmitted)
      ) {
        return []
      }
      if (field.format === 'object' && isObject(value)) {
        const fields =
          'parameters' in field ? field.parameters : field.properties
        if (hideDiscriminatedExample(field, fields, value, isOmitted)) return []
        return [[name, omitExampleFields(value, fields, isOmitted)]]
      }
      if (field.format !== 'list' || !Array.isArray(value)) {
        return [[name, value]]
      }
      return [
        [
          name,
          value.flatMap((item) => {
            if (isLiteralOmitted(field, item, isOmitted)) return []
            if (!isObject(item)) return [item]
            const discriminator =
              field.itemFormat === 'discriminated_object'
                ? field.discriminator
                : flattenedDiscriminators.get(field)
            const variants =
              field.itemFormat === 'discriminated_object'
                ? field.variants
                : 'itemParameters' in field
                  ? taggedArrayProjections.get(field)?.variants
                  : undefined
            if (discriminator != null && variants != null) {
              for (const variant of variants) {
                const fields =
                  'parameters' in variant
                    ? variant.parameters
                    : variant.properties
                const tag = fields.find(({ name }) => name === discriminator)
                if (
                  tag == null ||
                  getEnumValues(tag)?.some(
                    ({ name }) => name === item[discriminator],
                  ) !== true
                ) {
                  continue
                }
                if (
                  isVariantOmitted(variant, discriminator, isOmitted) ||
                  isLiteralOmitted(tag, item[tag.name], isOmitted)
                ) {
                  return []
                }
                return [omitExampleFields(item, fields, isOmitted)]
              }
            }
            if (field.itemFormat === 'object') {
              const fields =
                'itemParameters' in field
                  ? field.itemParameters
                  : field.itemProperties
              if (hideDiscriminatedExample(field, fields, item, isOmitted)) {
                return []
              }
              return [omitExampleFields(item, fields, isOmitted)]
            }
            return [item]
          }),
        ],
      ]
    }),
  )
}

interface SampleContext extends Pick<
  ResourceSampleContext,
  'schemas' | 'formatCode'
> {
  codeSampleDefinitions: CodeSampleDefinition[]
  resourceSampleDefinitions: ResourceSampleDefinition[]
}

export const renderBlueprintSamples = async (
  original: Blueprint,
  visible: Blueprint,
  context: SampleContext,
  isOmitted: IsOmitted,
): Promise<Blueprint> => {
  const resources = new Map(
    original.resources.map((resource) => [resource.resourceType, resource]),
  )
  const events = new Map(
    original.events.map((event) => [event.eventType, event]),
  )
  const attempts = new Map(
    original.actionAttempts.map((attempt) => [
      attempt.actionAttemptType,
      attempt,
    ]),
  )
  const getExampleResource = (
    type: string,
    value: JsonObject,
  ): Resource | undefined => {
    if (type === 'event' && typeof value['event_type'] === 'string') {
      return events.get(value['event_type']) ?? resources.get(type)
    }
    if (type === 'action_attempt' && typeof value['action_type'] === 'string') {
      return attempts.get(value['action_type']) ?? resources.get(type)
    }
    return resources.get(type)
  }

  const omitResponseFields = (
    body: JsonObject,
    fields: Record<string, ResponseField>,
  ): JsonObject =>
    Object.fromEntries(
      Object.entries(body).flatMap(([key, value]) => {
        const field = fields[key]
        if (field == null) return [[key, value]]
        if (isOmitted(field)) return []
        const filterItem = (item: Json): Json | undefined => {
          if (!isObject(item)) return item
          if (field.children != null) {
            return omitResponseFields(item, field.children)
          }
          const type = field.resourceType
          if (type == null) return item
          if (type === original.pagination?.responseKey) {
            return visible.pagination == null
              ? undefined
              : omitExampleFields(
                  item,
                  original.pagination.properties,
                  isOmitted,
                )
          }
          const resource = getExampleResource(type, item)
          if (resource == null) return item
          return isOmitted(resource)
            ? undefined
            : omitExampleFields(item, resource.properties, isOmitted)
        }
        if (field.isList && Array.isArray(value)) {
          return [
            [
              key,
              value.flatMap((item) => {
                const visible = filterItem(item)
                return visible === undefined ? [] : [visible]
              }),
            ],
          ]
        }
        const filtered = filterItem(value)
        return filtered === undefined ? [] : [[key, filtered]]
      }),
    )

  const rawEndpoints = new Map(
    original.routes
      .flatMap(({ endpoints }) => endpoints)
      .map((endpoint) => [endpoint.path, endpoint]),
  )
  const renderEndpoint = async (endpoint: Endpoint): Promise<void> => {
    const rawEndpoint = rawEndpoints.get(endpoint.path) ?? endpoint
    endpoint.codeSamples = await Promise.all(
      context.codeSampleDefinitions
        .filter(({ request }) => request.path === endpoint.path)
        .flatMap((definition) => {
          if (original === visible) {
            return [
              createCodeSample(definition, {
                endpoint,
                formatCode: context.formatCode,
              }),
            ]
          }
          const request = requestVisibility.get(rawEndpoint.request)
          if (request != null && isOmitted(request)) return []
          const parameters = omitExampleFields(
            definition.request.parameters,
            rawEndpoint.request.parameters,
            isOmitted,
          )
          const visibility = responseVisibility.get(rawEndpoint)
          const rawBody = definition.response.body
          const body =
            rawBody == null || visibility == null
              ? rawBody
              : isOmitted(visibility.body)
                ? null
                : omitResponseFields(rawBody, visibility.fields)
          const response = rawEndpoint.response
          if (
            response.responseType !== 'void' &&
            rawBody?.[response.responseKey] != null &&
            (endpoint.response.responseType === 'void' ||
              body?.[response.responseKey] == null)
          ) {
            return []
          }
          return [
            createCodeSample(
              {
                ...definition,
                request: { ...definition.request, parameters },
                response: { body },
              },
              { endpoint, formatCode: context.formatCode },
            ),
          ]
        }),
    )
  }

  const renderResource = async (resource: Resource): Promise<void> => {
    resource.resourceSamples = await Promise.all(
      context.resourceSampleDefinitions.flatMap((definition) => {
        if (definition.resource_type !== resource.resourceType) return []
        const properties = definition.properties
        if (
          'eventType' in resource &&
          resource.eventType !== properties['event_type']
        ) {
          return []
        }
        if (
          'actionAttemptType' in resource &&
          resource.actionAttemptType !== properties['action_type']
        ) {
          return []
        }
        const raw = getExampleResource(resource.resourceType, properties)
        if (raw != null && isOmitted(raw)) return []
        const visibleProperties =
          original === visible || raw == null
            ? properties
            : omitExampleFields(properties, raw.properties, isOmitted)
        return [
          createResourceSample(
            definition,
            { ...context, resource },
            visibleProperties,
          ),
        ]
      }),
    )
  }
  await Promise.all([
    ...visible.routes.flatMap(({ endpoints }) => endpoints.map(renderEndpoint)),
    ...[...visible.resources, ...visible.events, ...visible.actionAttempts].map(
      renderResource,
    ),
  ])
  return visible
}
