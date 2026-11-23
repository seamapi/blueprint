import { isDeepStrictEqual } from 'node:util'

import type { BlueprintOptions } from 'lib/blueprint.js'
import type { Json } from 'lib/json.js'

import { flattenOpenapiSchema } from './flatten-openapi-schema.js'
import type { Openapi, OpenapiEnumValue, OpenapiSchema } from './types.js'

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

  const isOmittedEnum = (
    schema: OpenapiSchema,
    value: OpenapiEnumValue,
    eventField: boolean,
  ): boolean => {
    const annotation = schema['x-enums']?.[String(value)]
    return (
      (omitUndocumented === true && (annotation?.undocumented ?? '') !== '') ||
      (omitEndOfLife === true && (annotation?.end_of_life ?? '') !== '') ||
      (eventField &&
        schema.enum?.includes(value) === true &&
        omittedEvents.has(value))
    )
  }

  const resolve = (schema: OpenapiSchema): OpenapiSchema | undefined =>
    schema.$ref?.startsWith('#/components/schemas/') === true
      ? schemas[schema.$ref.slice('#/components/schemas/'.length)]
      : undefined

  const matchesBranch = (
    value: Json,
    branch: OpenapiSchema,
    discriminator?: string,
  ): boolean => {
    branch = resolve(branch) ?? branch
    if (discriminator != null) {
      if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return false
      }
      const normalized =
        branch.allOf == null ? branch : flattenOpenapiSchema(branch)
      return (
        normalized.properties?.[discriminator]?.enum?.some(
          (literal) => literal === value[discriminator],
        ) === true
      )
    }
    if (
      branch.enum != null &&
      !branch.enum.some((literal) => literal === value)
    ) {
      return false
    }
    if (value === null && branch.nullable === true) return true
    if (branch.allOf?.some((member) => !matchesBranch(value, member)))
      return false
    if (
      branch.oneOf != null &&
      branch.oneOf.filter((member) => matchesBranch(value, member)).length !== 1
    ) {
      return false
    }
    if (Array.isArray(value)) {
      const { items } = branch
      return (
        (branch.type == null || branch.type === 'array') &&
        (items == null || value.every((item) => matchesBranch(item, items)))
      )
    }
    if (value == null || typeof value !== 'object') {
      if (branch.type === 'integer') return Number.isInteger(value)
      return branch.type == null || branch.type === typeof value
    }
    return (
      (branch.type == null || branch.type === 'object') &&
      (branch.required ?? []).every((name) => Object.hasOwn(value, name)) &&
      Object.entries(branch.properties ?? {}).every(([name, property]) => {
        const field = value[name]
        return field === undefined || matchesBranch(field, property)
      })
    )
  }

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
    if (
      (typeof value === 'string' || typeof value === 'boolean') &&
      isOmittedEnum(schema, value, eventField)
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
    if (Array.isArray(value)) {
      const items = schema.items
      if (items == null) return value
      return value.flatMap((item) => {
        const visible = omitValue(item, items, eventProjection, eventField)
        return visible === undefined ? [] : [visible]
      })
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

  const omitSchema = (
    schema: OpenapiSchema,
    { eventProjection = false, request = false } = {},
    eventField = false,
    listItem = false,
    inheritedEnumOmission?: (value: OpenapiEnumValue) => boolean,
  ): OpenapiSchema | undefined => {
    const scope = { eventProjection, request }
    const hidesEnum = (value: OpenapiEnumValue): boolean =>
      isOmittedEnum(schema, value, eventField) ||
      inheritedEnumOmission?.(value) === true
    let result = { ...schema }
    if (schema.enum != null) {
      result.enum = schema.enum.filter((value) => !hidesEnum(value))
    }
    if (Object.hasOwn(schema, 'default')) {
      const visible = omitValue(
        schema.default,
        schema,
        eventProjection,
        eventField,
      )
      if (!isDeepStrictEqual(visible, schema.default)) delete result.default
    }
    const originalProperties = schema.properties
    if (originalProperties != null) {
      const properties = Object.fromEntries(
        Object.entries(originalProperties).flatMap(([name, property]) => {
          const visible = omitSchema(
            property,
            scope,
            eventProjection && isEventField(name),
          )
          return visible == null ? [] : [[name, visible]]
        }),
      )
      result.properties = properties
      if (schema.required != null) {
        result.required = schema.required.filter(
          (name) =>
            !Object.hasOwn(originalProperties, name) ||
            Object.hasOwn(properties, name),
        )
      }
    }
    if (typeof schema.additionalProperties === 'object') {
      result.additionalProperties =
        omitSchema(schema.additionalProperties, scope) ?? false
    }
    if (schema.items != null) {
      const items = omitSchema(schema.items, scope, eventField, true)
      if (items == null) return undefined
      result.items = items
    }
    if (schema.allOf != null) {
      const branches = schema.allOf.map((branch) =>
        omitSchema(branch, scope, eventField, listItem, hidesEnum),
      )
      if (!branches.every((branch) => branch != null)) return undefined
      result.allOf = branches
    }
    if (schema.oneOf != null) {
      const omitBranches =
        request ||
        schema.discriminator != null ||
        schema.oneOf.every((branch) => branch.enum != null)
      const branches = schema.oneOf.flatMap((branch) => {
        if (omitBranches && isOmitted(branch)) return []
        const visible = omitSchema(
          branch,
          scope,
          eventField,
          listItem,
          hidesEnum,
        )
        return visible == null ? [] : [visible]
      })
      const removed = branches.length !== schema.oneOf.length
      if (removed && branches.length === 0) {
        if (
          listItem &&
          schema.discriminator != null &&
          schema.oneOf.every(
            (branch) => flattenOpenapiSchema(branch).type === 'object',
          )
        ) {
          return { ...result, type: 'object', oneOf: [] }
        }
        return undefined
      }
      result.oneOf = branches.map((visible) => {
        if (
          !removed ||
          schema.discriminator == null ||
          (visible.allOf == null && visible.oneOf == null)
        ) {
          return visible
        }
        const { allOf: _allOf, oneOf: _oneOf, ...metadata } = visible
        return { ...metadata, ...flattenOpenapiSchema(visible) }
      })
    }
    return result
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
