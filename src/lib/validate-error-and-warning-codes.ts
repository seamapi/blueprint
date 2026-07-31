import type { Blueprint, Property, Resource } from './blueprint.js'

const errorDiscriminator = 'error_code'
const warningDiscriminator = 'warning_code'
const redundantCodeWords = ['error', 'warning']

type ResourceBlueprint = Pick<
  Blueprint,
  'resources' | 'events' | 'actionAttempts'
>

export const assertResourceErrorAndWarningCodesDontOverlap = (
  blueprint: ResourceBlueprint,
): void => {
  const offenders = labelResources(blueprint).flatMap(
    ([label, { properties }]) => {
      const errorCodes = new Set(findCodes(properties, errorDiscriminator))
      const overlappingCodes = new Set(
        findCodes(properties, warningDiscriminator).filter((code) =>
          errorCodes.has(code),
        ),
      )

      return [...overlappingCodes].map(
        (code) => `${label} has an error and a warning with the code '${code}'`,
      )
    },
  )

  if (offenders.length > 0) {
    throw new Error(
      `Resources must not have an error and a warning with the same code. Found:\n${offenders.join('\n')}`,
    )
  }
}

export const assertResourceErrorAndWarningCodesDontContainRedundantWords = (
  blueprint: ResourceBlueprint,
): void => {
  const offenders = labelResources(blueprint).flatMap(
    ([label, { properties }]) => [
      ...findRedundantlyWordedCodes(properties, errorDiscriminator).map(
        (code) => `${label} has an error with the code '${code}'`,
      ),
      ...findRedundantlyWordedCodes(properties, warningDiscriminator).map(
        (code) => `${label} has a warning with the code '${code}'`,
      ),
    ],
  )

  if (offenders.length > 0) {
    throw new Error(
      `Error and warning codes must not contain ${redundantCodeWords
        .map((word) => `'${word}'`)
        .join(' or ')}. Found:\n${offenders.join('\n')}`,
    )
  }
}

const labelResources = ({
  resources,
  events,
  actionAttempts,
}: ResourceBlueprint): Array<readonly [string, Resource]> => [
  ...resources.map(
    (resource) => [`resource '${resource.resourceType}'`, resource] as const,
  ),
  ...events.map((event) => [`event '${event.eventType}'`, event] as const),
  ...actionAttempts.map(
    (actionAttempt) =>
      [
        `action_attempt '${actionAttempt.actionAttemptType}'`,
        actionAttempt,
      ] as const,
  ),
]

const findRedundantlyWordedCodes = (
  properties: Property[],
  discriminator: string,
): string[] => [
  ...new Set(
    findCodes(properties, discriminator).filter((code) =>
      redundantCodeWords.some((word) => code.toLowerCase().includes(word)),
    ),
  ),
]

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
