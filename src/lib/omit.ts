import type {
  Blueprint,
  Parameter,
  Property,
  Resource,
  Route,
} from './blueprint.js'

interface Omittable {
  isUndocumented: boolean
  isEndOfLife: boolean
}

type IsOmitted = (item: Omittable) => boolean

export const omitUndocumentedFromBlueprint = (
  blueprint: Blueprint,
): Blueprint => omitFromBlueprint(blueprint, (item) => item.isUndocumented)

export const omitEndOfLifeFromBlueprint = (blueprint: Blueprint): Blueprint =>
  omitFromBlueprint(blueprint, (item) => item.isEndOfLife)

const omitFromBlueprint = (
  blueprint: Blueprint,
  isOmitted: IsOmitted,
): Blueprint => ({
  ...blueprint,
  routes: blueprint.routes
    .filter((route) => !isOmitted(route))
    .map((x) => omitFromRoute(x, isOmitted)),
  namespaces: blueprint.namespaces.filter((namespace) => !isOmitted(namespace)),
  resources: blueprint.resources
    .filter((resource) => !isOmitted(resource))
    .map((x) => omitFromResource(x, isOmitted)),
  pagination:
    blueprint.pagination == null
      ? null
      : {
          ...blueprint.pagination,
          properties: omitFromProperties(
            blueprint.pagination.properties,
            isOmitted,
          ),
        },
  events: blueprint.events
    .filter((event) => !isOmitted(event))
    .map((x) => omitFromResource(x, isOmitted)),
  actionAttempts: blueprint.actionAttempts
    .filter((actionAttempt) => !isOmitted(actionAttempt))
    .map((x) => omitFromResource(x, isOmitted)),
})

const omitFromRoute = (route: Route, isOmitted: IsOmitted): Route => ({
  ...route,
  endpoints: route.endpoints
    .filter((endpoint) => !isOmitted(endpoint))
    .map((endpoint) => ({
      ...endpoint,
      request: {
        ...endpoint.request,
        parameters: omitFromParameters(endpoint.request.parameters, isOmitted),
      },
    })),
})

const omitFromResource = <T extends Resource>(
  resource: T,
  isOmitted: IsOmitted,
): T => ({
  ...resource,
  properties: omitFromProperties(resource.properties, isOmitted),
})

const omitFromParameters = (
  parameters: Parameter[],
  isOmitted: IsOmitted,
): Parameter[] =>
  parameters
    .filter((parameter) => !isOmitted(parameter))
    .map((x) => omitFromParameter(x, isOmitted))

const omitFromParameter = (
  parameter: Parameter,
  isOmitted: IsOmitted,
): Parameter => {
  if (parameter.format === 'enum') {
    return {
      ...parameter,
      values: parameter.values.filter((value) => !isOmitted(value)),
    }
  }
  if (parameter.format === 'object') {
    return {
      ...parameter,
      parameters: omitFromParameters(parameter.parameters, isOmitted),
    }
  }
  if (parameter.format === 'list') {
    if (parameter.itemFormat === 'enum') {
      return {
        ...parameter,
        itemEnumValues: parameter.itemEnumValues.filter(
          (value) => !isOmitted(value),
        ),
      }
    }
    if (parameter.itemFormat === 'object') {
      return {
        ...parameter,
        itemParameters: omitFromParameters(parameter.itemParameters, isOmitted),
      }
    }
    if (parameter.itemFormat === 'discriminated_object') {
      return {
        ...parameter,
        variants: parameter.variants.map((variant) => ({
          ...variant,
          parameters: omitFromParameters(variant.parameters, isOmitted),
        })),
      }
    }
  }
  return parameter
}

const omitFromProperties = (
  properties: Property[],
  isOmitted: IsOmitted,
): Property[] =>
  properties
    .filter((property) => !isOmitted(property))
    .map((x) => omitFromProperty(x, isOmitted))

const omitFromProperty = (
  property: Property,
  isOmitted: IsOmitted,
): Property => {
  if (property.format === 'enum') {
    return {
      ...property,
      values: property.values.filter((value) => !isOmitted(value)),
    }
  }
  if (property.format === 'object') {
    return {
      ...property,
      properties: omitFromProperties(property.properties, isOmitted),
    }
  }
  if (property.format === 'list') {
    if (property.itemFormat === 'enum') {
      return {
        ...property,
        itemEnumValues: property.itemEnumValues.filter(
          (value) => !isOmitted(value),
        ),
      }
    }
    if (property.itemFormat === 'object') {
      return {
        ...property,
        itemProperties: omitFromProperties(property.itemProperties, isOmitted),
      }
    }
    if (property.itemFormat === 'discriminated_object') {
      return {
        ...property,
        variants: property.variants.map((variant) => ({
          ...variant,
          properties: omitFromProperties(variant.properties, isOmitted),
        })),
      }
    }
  }
  return property
}
