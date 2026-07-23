import type {
  Blueprint,
  Parameter,
  Property,
  Resource,
  Route,
} from './blueprint.js'

export const omitUndocumentedFromBlueprint = (
  blueprint: Blueprint,
): Blueprint => ({
  ...blueprint,
  routes: blueprint.routes
    .filter((route) => !route.isUndocumented)
    .map(omitUndocumentedFromRoute),
  namespaces: blueprint.namespaces.filter(
    (namespace) => !namespace.isUndocumented,
  ),
  resources: blueprint.resources
    .filter((resource) => !resource.isUndocumented)
    .map(omitUndocumentedFromResource),
  pagination:
    blueprint.pagination == null
      ? null
      : {
          ...blueprint.pagination,
          properties: omitUndocumentedFromProperties(
            blueprint.pagination.properties,
          ),
        },
  events: blueprint.events
    .filter((event) => !event.isUndocumented)
    .map(omitUndocumentedFromResource),
  actionAttempts: blueprint.actionAttempts
    .filter((actionAttempt) => !actionAttempt.isUndocumented)
    .map(omitUndocumentedFromResource),
})

const omitUndocumentedFromRoute = (route: Route): Route => ({
  ...route,
  endpoints: route.endpoints
    .filter((endpoint) => !endpoint.isUndocumented)
    .map((endpoint) => ({
      ...endpoint,
      request: {
        ...endpoint.request,
        parameters: omitUndocumentedFromParameters(endpoint.request.parameters),
      },
    })),
})

const omitUndocumentedFromResource = <T extends Resource>(resource: T): T => ({
  ...resource,
  properties: omitUndocumentedFromProperties(resource.properties),
})

const omitUndocumentedFromParameters = (parameters: Parameter[]): Parameter[] =>
  parameters
    .filter((parameter) => !parameter.isUndocumented)
    .map(omitUndocumentedFromParameter)

const omitUndocumentedFromParameter = (parameter: Parameter): Parameter => {
  if (parameter.format === 'enum') {
    return {
      ...parameter,
      values: parameter.values.filter((value) => !value.isUndocumented),
    }
  }
  if (parameter.format === 'object') {
    return {
      ...parameter,
      parameters: omitUndocumentedFromParameters(parameter.parameters),
    }
  }
  if (parameter.format === 'list') {
    if (parameter.itemFormat === 'enum') {
      return {
        ...parameter,
        itemEnumValues: parameter.itemEnumValues.filter(
          (value) => !value.isUndocumented,
        ),
      }
    }
    if (parameter.itemFormat === 'object') {
      return {
        ...parameter,
        itemParameters: omitUndocumentedFromParameters(
          parameter.itemParameters,
        ),
      }
    }
    if (parameter.itemFormat === 'discriminated_object') {
      return {
        ...parameter,
        variants: parameter.variants.map((variant) => ({
          ...variant,
          parameters: omitUndocumentedFromParameters(variant.parameters),
        })),
      }
    }
  }
  return parameter
}

const omitUndocumentedFromProperties = (properties: Property[]): Property[] =>
  properties
    .filter((property) => !property.isUndocumented)
    .map(omitUndocumentedFromProperty)

const omitUndocumentedFromProperty = (property: Property): Property => {
  if (property.format === 'enum') {
    return {
      ...property,
      values: property.values.filter((value) => !value.isUndocumented),
    }
  }
  if (property.format === 'object') {
    return {
      ...property,
      properties: omitUndocumentedFromProperties(property.properties),
    }
  }
  if (property.format === 'list') {
    if (property.itemFormat === 'enum') {
      return {
        ...property,
        itemEnumValues: property.itemEnumValues.filter(
          (value) => !value.isUndocumented,
        ),
      }
    }
    if (property.itemFormat === 'object') {
      return {
        ...property,
        itemProperties: omitUndocumentedFromProperties(property.itemProperties),
      }
    }
    if (property.itemFormat === 'discriminated_object') {
      return {
        ...property,
        variants: property.variants.map((variant) => ({
          ...variant,
          properties: omitUndocumentedFromProperties(variant.properties),
        })),
      }
    }
  }
  return property
}
