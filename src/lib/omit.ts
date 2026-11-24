import type {
  Blueprint,
  Endpoint,
  EnumProperty,
  Parameter,
  Property,
} from './blueprint.js'
import {
  booleanVisibility,
  flattenedDiscriminators,
  isNodeOmitted,
  type IsOmitted,
  paginationVisibility,
  requestVisibility,
  responseVisibility,
  taggedArrayProjections,
} from './visibility.js'

export type Field = Property | Parameter

export const getEnumValues = (
  field: Field,
):
  | EnumProperty['values']
  | Extract<Parameter, { format: 'enum' }>['values']
  | undefined => {
  if (field.format === 'enum') return field.values
  if (field.format === 'list' && field.itemFormat === 'enum') {
    return field.itemEnumValues
  }
  return undefined
}

type AnnotateFields = (fields: Field[]) => void

const eventProjectionAnnotator = (
  catalog: Blueprint['events'],
): AnnotateFields => {
  const events = new Map(catalog.map((event) => [event.eventType, event]))
  const annotate = (fields: Field[]): void => {
    for (const field of fields) {
      if (field.name === 'event_type' || field.name === 'event_types') {
        for (const value of getEnumValues(field) ?? []) {
          const event = events.get(value.name)
          if (event == null) continue
          value.isUndocumented ||= event.isUndocumented
          value.undocumentedMessage ||= event.undocumentedMessage
          value.isEndOfLife ||= event.isEndOfLife
          value.endOfLifeMessage ||= event.endOfLifeMessage
        }
      }
      if (field.format === 'object') {
        annotate('parameters' in field ? field.parameters : field.properties)
      } else if (field.format === 'list' && field.itemFormat === 'object') {
        if ('itemParameters' in field) {
          annotate(field.itemParameters)
          for (const variant of taggedArrayProjections.get(field)?.variants ??
            []) {
            annotate(variant.parameters)
          }
        } else {
          annotate(field.itemProperties)
        }
      } else if (
        field.format === 'list' &&
        field.itemFormat === 'discriminated_object'
      ) {
        for (const variant of field.variants) {
          annotate(
            'parameters' in variant ? variant.parameters : variant.properties,
          )
        }
      }
    }
  }
  return annotate
}

export const annotateEventProjections = (blueprint: Blueprint): void => {
  const annotate = eventProjectionAnnotator(blueprint.events)
  for (const route of blueprint.routes) {
    for (const endpoint of route.endpoints) {
      annotate(endpoint.request.parameters)
    }
  }
  for (const resource of [
    ...blueprint.resources,
    ...blueprint.events,
    ...blueprint.actionAttempts,
  ]) {
    annotate(resource.properties)
  }
  annotate(blueprint.pagination?.properties ?? [])
}

export const isFieldOmitted = (field: Field, isOmitted: IsOmitted): boolean => {
  if (isOmitted(field)) return true
  const values = getEnumValues(field)
  if (values != null && values.length > 0 && values.every(isOmitted)) {
    return true
  }
  return (
    field.format === 'boolean' &&
    field.values != null &&
    field.values.length > 0 &&
    field.values.every((value) => isLiteralOmitted(field, value, isOmitted))
  )
}

export const isLiteralOmitted = (
  field: Field,
  value: unknown,
  isOmitted: IsOmitted,
): boolean => {
  const flags =
    typeof value === 'boolean'
      ? booleanVisibility.get(field)?.get(value)
      : undefined
  return (
    (flags != null && isOmitted(flags)) ||
    getEnumValues(field)?.some(
      (member) => member.name === value && isOmitted(member),
    ) === true
  )
}

export const isVariantOmitted = (
  variant: { properties: Property[] } | { parameters: Parameter[] },
  discriminator: string,
  isOmitted: IsOmitted,
): boolean => {
  const fields =
    'parameters' in variant ? variant.parameters : variant.properties
  const tag = fields.find(({ name }) => name === discriminator)
  return (
    isNodeOmitted(variant, isOmitted) ||
    (tag != null && isFieldOmitted(tag, isOmitted))
  )
}

const omitFields = <T extends Field>(
  fields: T[],
  isOmitted: IsOmitted,
  annotate: AnnotateFields,
): T[] =>
  fields
    .filter((field) => !isFieldOmitted(field, isOmitted))
    .map((field) => {
      const visible = omitField(field, isOmitted, annotate)
      if (
        'hasDefault' in visible &&
        'default' in visible &&
        visible.hasDefault
      ) {
        if (
          isLiteralOmitted(field, visible.default, isOmitted) ||
          (Array.isArray(visible.default) &&
            visible.default.some((value) =>
              isLiteralOmitted(field, value, isOmitted),
            ))
        ) {
          const { default: _default, ...rest } = visible
          return { ...rest, hasDefault: false } as T
        }
      }
      return visible as T
    })

const omitField = (
  field: Field,
  isOmitted: IsOmitted,
  annotate: AnnotateFields,
): Field => {
  if (field.format === 'enum') {
    return {
      ...field,
      values: field.values.filter((value) => !isOmitted(value)),
    }
  }
  if (field.format === 'boolean' && field.values != null) {
    return {
      ...field,
      values: field.values.filter(
        (value) => !isLiteralOmitted(field, value, isOmitted),
      ),
    }
  }
  if (field.format === 'object') {
    return 'parameters' in field
      ? {
          ...field,
          parameters: omitFields(field.parameters, isOmitted, annotate),
        }
      : {
          ...field,
          properties: omitFields(field.properties, isOmitted, annotate),
        }
  }
  if (field.format !== 'list') return field
  if (field.itemFormat === 'enum') {
    return {
      ...field,
      itemEnumValues: field.itemEnumValues.filter((value) => !isOmitted(value)),
    }
  }
  if (field.itemFormat === 'object') {
    if ('itemProperties' in field) {
      return {
        ...field,
        itemProperties: omitFields(field.itemProperties, isOmitted, annotate),
      }
    }
    const projection = taggedArrayProjections.get(field)
    const discriminator = flattenedDiscriminators.get(field)
    let fields = field.itemParameters
    if (projection != null && discriminator != null) {
      const visible = projection.variants.flatMap((variant, index) =>
        isVariantOmitted(variant, discriminator, isOmitted) ? [] : [index],
      )
      if (visible.length !== projection.variants.length) {
        fields = projection.project(visible)
        annotate(fields)
      }
    }
    return { ...field, itemParameters: omitFields(fields, isOmitted, annotate) }
  }
  if (field.itemFormat === 'discriminated_object') {
    if ('isRequired' in field) {
      return {
        ...field,
        variants: field.variants
          .filter(
            (variant) =>
              !isVariantOmitted(variant, field.discriminator, isOmitted),
          )
          .map((variant) => ({
            ...variant,
            parameters: omitFields(variant.parameters, isOmitted, annotate),
          })),
      }
    }
    return {
      ...field,
      variants: field.variants
        .filter(
          (variant) =>
            !isVariantOmitted(variant, field.discriminator, isOmitted),
        )
        .map((variant) => ({
          ...variant,
          properties: omitFields(variant.properties, isOmitted, annotate),
        })),
    }
  }
  return field
}

export const omitFromBlueprint = (
  blueprint: Blueprint,
  isOmitted: IsOmitted,
): Blueprint => {
  const annotate = eventProjectionAnnotator(blueprint.events)
  const hiddenResources = new Set(
    blueprint.resources
      .filter(isOmitted)
      .map(({ resourceType }) => resourceType),
  )
  const { pagination } = blueprint
  const paginationFlags =
    pagination == null ? undefined : paginationVisibility.get(pagination)
  const hiddenPagination = paginationFlags != null && isOmitted(paginationFlags)
  const omitFromEndpoint = (endpoint: Endpoint): Endpoint => {
    const flags = requestVisibility.get(endpoint.request)
    const parameters =
      flags != null && isOmitted(flags)
        ? []
        : omitFields(endpoint.request.parameters, isOmitted, annotate)
    const { response } = endpoint
    const visibility = responseVisibility.get(endpoint)
    const field =
      response.responseType === 'void'
        ? undefined
        : visibility?.fields[response.responseKey]
    const hiddenResponse =
      (visibility != null && isOmitted(visibility.body)) ||
      (field != null && isOmitted(field)) ||
      (response.responseType !== 'void' &&
        hiddenResources.has(response.resourceType))
    const paginationField =
      pagination == null
        ? undefined
        : visibility?.fields[pagination.responseKey]
    return {
      ...endpoint,
      request: {
        ...endpoint.request,
        parameters,
        hasRequiredParameters:
          flags?.requiredOverride ??
          (endpoint.request.parameters.some(
            (parameter) =>
              parameter.isRequired && isFieldOmitted(parameter, isOmitted),
          ) ||
          (flags != null && isOmitted(flags))
            ? parameters.some((parameter) => parameter.isRequired)
            : endpoint.request.hasRequiredParameters),
      },
      hasPagination:
        endpoint.hasPagination &&
        !hiddenPagination &&
        !hiddenResponse &&
        (paginationField == null || !isOmitted(paginationField)),
      response: hiddenResponse
        ? { responseType: 'void', description: response.description }
        : response.responseType === 'resource' &&
            response.batchResourceTypes != null
          ? {
              ...response,
              batchResourceTypes: response.batchResourceTypes.filter(
                ({ batchKey, resourceType }) => {
                  const child = field?.children?.[batchKey]
                  return (
                    !hiddenResources.has(resourceType) &&
                    (child == null || !isOmitted(child))
                  )
                },
              ),
            }
          : response,
    }
  }
  const omitFromResource = <T extends Blueprint['resources'][number]>(
    resource: T,
  ): T => ({
    ...resource,
    properties: omitFields(resource.properties, isOmitted, annotate),
  })
  return {
    ...blueprint,
    routes: blueprint.routes
      .filter((route) =>
        route.endpoints.some((endpoint) => !isOmitted(endpoint)),
      )
      .map((route) => ({
        ...route,
        endpoints: route.endpoints
          .filter((endpoint) => !isOmitted(endpoint))
          .map(omitFromEndpoint),
      })),
    namespaces: blueprint.namespaces.filter(
      (namespace) => !isOmitted(namespace),
    ),
    resources: blueprint.resources
      .filter((resource) => !isOmitted(resource))
      .map(omitFromResource),
    events: blueprint.events
      .filter((event) => !isOmitted(event))
      .map(omitFromResource),
    actionAttempts: blueprint.actionAttempts
      .filter((attempt) => !isOmitted(attempt))
      .map(omitFromResource),
    pagination:
      pagination != null && !hiddenPagination
        ? {
            ...pagination,
            properties: omitFields(pagination.properties, isOmitted, annotate),
          }
        : null,
  }
}
