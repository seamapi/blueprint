import type { BlueprintOptions } from 'lib/blueprint.js'
import type { Json } from 'lib/json.js'

import { flattenOpenapiSchema } from './flatten-openapi-schema.js'
import type { Openapi, OpenapiSchema } from './types.js'

const eventProjectionPaths = new Set([
  '/access_codes/get_timeline',
  '/events/list',
  '/seam/customer/v1/events/list',
  '/seam/webhooks/v1/preview_event',
  '/seam/webhooks/v1/simulate_event',
  '/webhooks/create',
  '/webhooks/update',
])

export const isEventProjectionPath = (path: string): boolean =>
  eventProjectionPaths.has(path)

const isEventField = (name: string): boolean =>
  name === 'event_type' || name === 'event_types'

export const createOpenapiOmissions = (
  schemas: Openapi['components']['schemas'],
  { omitUndocumented, omitEndOfLife }: BlueprintOptions,
) => {
  if (!omitUndocumented && !omitEndOfLife) return undefined

  const isOmitted = (schema: OpenapiSchema): boolean =>
    (omitUndocumented === true && (schema['x-undocumented'] ?? '') !== '') ||
    (omitEndOfLife === true && (schema['x-end-of-life'] ?? '') !== '') ||
    schema.allOf?.some(isOmitted) === true

  const omittedEvents = new Set(
    schemas['event']?.oneOf?.flatMap((event) =>
      isOmitted(event) ? (event.properties?.['event_type']?.enum ?? []) : [],
    ),
  )

  const omitSchema = (
    schema: OpenapiSchema,
    { eventProjection = false, request = false } = {},
    eventField = false,
    omitBranches = request || schema.discriminator != null,
  ): OpenapiSchema => {
    const scope = { eventProjection, request }
    let result = schema
    if (eventField && schema.enum != null) {
      result = {
        ...result,
        enum: schema.enum.filter((value) => !omittedEvents.has(value)),
      }
    }
    if (schema.properties != null) {
      result = {
        ...result,
        properties: Object.fromEntries(
          Object.entries(schema.properties).map(([name, property]) => [
            name,
            omitSchema(property, scope, eventProjection && isEventField(name)),
          ]),
        ),
      }
    }
    if (schema.items != null) {
      result = {
        ...result,
        items: omitSchema(
          schema.items,
          scope,
          eventField,
          request || schema.items.discriminator != null,
        ),
      }
    }
    if (schema.allOf != null) {
      result = {
        ...result,
        allOf: schema.allOf.map((branch) =>
          omitSchema(branch, scope, eventField),
        ),
      }
    }
    if (schema.oneOf != null) {
      const branches = omitBranches
        ? schema.oneOf.filter((branch) => !isOmitted(branch))
        : schema.oneOf
      const removed = branches.length !== schema.oneOf.length
      result = {
        ...result,
        ...(removed && branches.length === 0 && { type: 'object' }),
        oneOf: branches.map((branch) => {
          const visible = omitSchema(branch, scope, eventField)
          if (
            !removed ||
            schema.discriminator == null ||
            (visible.allOf == null && visible.oneOf == null)
          ) {
            return visible
          }
          // Direct discriminated lists consume branch objects without flattening them.
          const { allOf: _allOf, oneOf: _oneOf, ...metadata } = visible
          return { ...metadata, ...flattenOpenapiSchema(visible) }
        }),
      }
    }
    return result
  }

  const resolve = (schema: OpenapiSchema): OpenapiSchema | undefined =>
    schema.$ref?.startsWith('#/components/schemas/') === true
      ? schemas[schema.$ref.slice('#/components/schemas/'.length)]
      : undefined

  const omitValue = (
    value: Json,
    schema: OpenapiSchema,
    eventProjection: boolean,
    eventField = false,
  ): Json | undefined => {
    const referenced = resolve(schema)
    if (isOmitted(schema) || (referenced != null && isOmitted(referenced))) {
      return undefined
    }
    schema = referenced ?? schema
    const annotation = schema['x-enums']?.[String(value)]
    if (
      (typeof value === 'string' || typeof value === 'boolean') &&
      ((omitUndocumented === true && (annotation?.undocumented ?? '') !== '') ||
        (omitEndOfLife === true && (annotation?.end_of_life ?? '') !== '') ||
        (eventField &&
          schema.enum?.includes(value) === true &&
          omittedEvents.has(value)))
    ) {
      return undefined
    }

    if (schema.allOf != null) {
      for (const branch of schema.allOf) {
        const next = omitValue(value, branch, eventProjection, eventField)
        if (next === undefined) return undefined
        value = next
      }
    }
    if (Array.isArray(value)) {
      const items = schema.items
      if (items == null) return value
      return value.flatMap((item) => {
        const visible = omitValue(item, items, eventProjection, eventField)
        return visible === undefined ? [] : [visible]
      })
    }
    if (schema.oneOf != null) {
      const matching = schema.oneOf.filter((branch) =>
        matchesBranch(value, branch, schema.discriminator?.propertyName),
      )
      const [branch] = matching
      if (matching.length === 1 && branch != null) {
        const visible = omitValue(value, branch, eventProjection, eventField)
        if (visible === undefined) return undefined
        value = visible
      }
    }
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return value
    }
    const additional =
      typeof schema.additionalProperties === 'object'
        ? schema.additionalProperties
        : undefined
    return Object.fromEntries(
      Object.entries(value).flatMap(([name, property]) => {
        const field = schema.properties?.[name] ?? additional
        const visible =
          field == null
            ? property
            : omitValue(
                property,
                field,
                eventProjection,
                eventProjection && isEventField(name),
              )
        return visible === undefined ? [] : [[name, visible]]
      }),
    )
  }

  return {
    isOmitted,
    omitSchema,
    omitSample: (
      value: Record<string, Json>,
      schema: OpenapiSchema | undefined,
      eventProjection = false,
    ): Record<string, Json> | undefined => {
      if (schema == null) return value
      const visible = omitValue(value, schema, eventProjection)
      return visible != null &&
        typeof visible === 'object' &&
        !Array.isArray(visible)
        ? visible
        : undefined
    },
  }
}

export type OpenapiOmissions = NonNullable<
  ReturnType<typeof createOpenapiOmissions>
>

const matchesBranch = (
  value: Json,
  branch: OpenapiSchema,
  discriminator?: string,
): boolean => {
  if (branch.enum != null) {
    return branch.enum.some((literal) => literal === value)
  }
  if (value == null) return branch.nullable === true
  if (Array.isArray(value)) return branch.type === 'array'
  if (typeof value !== 'object') {
    if (branch.type === 'integer') return Number.isInteger(value)
    const type = typeof value
    return branch.type === type
  }
  if (branch.type != null && branch.type !== 'object') return false
  const normalized =
    branch.allOf != null ? flattenOpenapiSchema(branch) : branch
  if (discriminator != null) {
    return (
      normalized.properties?.[discriminator]?.enum?.some(
        (literal) => literal === value[discriminator],
      ) === true
    )
  }
  return (
    (normalized.required ?? []).every((name) => Object.hasOwn(value, name)) &&
    Object.entries(normalized.properties ?? {}).every(
      ([name, property]) =>
        !Object.hasOwn(value, name) ||
        property.enum == null ||
        property.enum.some((literal) => literal === value[name]),
    )
  )
}
