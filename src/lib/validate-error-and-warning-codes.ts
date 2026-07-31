import type { Blueprint, Property, Resource } from './blueprint.js'

const errorDiscriminator = 'error_code'
const warningDiscriminator = 'warning_code'

export const assertResourceErrorAndWarningCodesDontOverlap = ({
  resources,
  events,
  actionAttempts,
}: Pick<Blueprint, 'resources' | 'events' | 'actionAttempts'>): void => {
  const offenders = [
    ...resources.flatMap((resource) =>
      findOverlappingCodeOffenders(
        resource,
        `resource '${resource.resourceType}'`,
      ),
    ),
    ...events.flatMap((event) =>
      findOverlappingCodeOffenders(event, `event '${event.eventType}'`),
    ),
    ...actionAttempts.flatMap((actionAttempt) =>
      findOverlappingCodeOffenders(
        actionAttempt,
        `action_attempt '${actionAttempt.actionAttemptType}'`,
      ),
    ),
  ]

  if (offenders.length > 0) {
    throw new Error(
      `Resources must not have an error and a warning with the same code. Found:\n${offenders.join('\n')}`,
    )
  }
}

const findOverlappingCodeOffenders = (
  { properties }: Resource,
  label: string,
): string[] => {
  const errorCodes = new Set(findCodes(properties, errorDiscriminator))
  const overlappingCodes = new Set(
    findCodes(properties, warningDiscriminator).filter((code) =>
      errorCodes.has(code),
    ),
  )

  return [...overlappingCodes].map(
    (code) => `${label} has an error and a warning with the code '${code}'`,
  )
}

const findCodes = (properties: Property[], discriminator: string): string[] =>
  properties.flatMap((property) => {
    if (property.format !== 'list') return []
    if (property.itemFormat !== 'discriminated_object') return []
    if (property.discriminator !== discriminator) return []

    return property.variants.flatMap((variant) =>
      variant.properties.flatMap((variantProperty) =>
        variantProperty.name === discriminator &&
        variantProperty.format === 'enum'
          ? variantProperty.values.map(({ name }) => name)
          : [],
      ),
    )
  })
