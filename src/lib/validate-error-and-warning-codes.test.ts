import test from 'ava'

import type {
  ActionAttempt,
  EventResource,
  Property,
  Resource,
} from 'lib/blueprint.js'
import { assertResourceErrorAndWarningCodesDontOverlap } from 'lib/validate-error-and-warning-codes.js'

const createCodeListProperty = (
  name: string,
  discriminator: string,
  codes: string[],
): Property =>
  ({
    name,
    format: 'list',
    jsonType: 'array',
    itemFormat: 'discriminated_object',
    discriminator,
    variantGroups: [],
    variants: codes.map((code) => ({
      resourceType: null,
      variantGroupKey: null,
      description: '',
      properties: [
        {
          name: discriminator,
          format: 'enum',
          jsonType: 'string',
          values: [{ name: code }],
        },
      ],
    })),
  }) as unknown as Property

const createResource = (
  resourceType: string,
  errorCodes: string[],
  warningCodes: string[],
): Resource =>
  ({
    resourceType,
    properties: [
      createCodeListProperty('errors', 'error_code', errorCodes),
      createCodeListProperty('warnings', 'warning_code', warningCodes),
    ],
  }) as unknown as Resource

test('assertResourceErrorAndWarningCodesDontOverlap: passes when codes are disjoint', (t) => {
  t.notThrows(() => {
    assertResourceErrorAndWarningCodesDontOverlap({
      resources: [createResource('foo', ['device_offline'], ['being_deleted'])],
      events: [],
      actionAttempts: [],
    })
  })
})

test('assertResourceErrorAndWarningCodesDontOverlap: throws when a resource shares a code', (t) => {
  const error = t.throws(
    () => {
      assertResourceErrorAndWarningCodesDontOverlap({
        resources: [
          createResource(
            'foo',
            ['device_offline', 'insufficient_permissions'],
            ['being_deleted', 'insufficient_permissions'],
          ),
        ],
        events: [],
        actionAttempts: [],
      })
    },
    { message: /must not have an error and a warning with the same code/ },
  )

  t.regex(
    error?.message ?? '',
    /resource 'foo' has an error and a warning with the code 'insufficient_permissions'/,
  )
})

test('assertResourceErrorAndWarningCodesDontOverlap: throws for events and action attempts', (t) => {
  const event = {
    ...createResource('event', ['bar'], ['bar']),
    eventType: 'foo.bar',
  } as unknown as EventResource
  const actionAttempt = {
    ...createResource('action_attempt', ['baz'], ['baz']),
    actionAttemptType: 'LOCK_DOOR',
  } as unknown as ActionAttempt

  const error = t.throws(() => {
    assertResourceErrorAndWarningCodesDontOverlap({
      resources: [],
      events: [event],
      actionAttempts: [actionAttempt],
    })
  })

  t.regex(
    error?.message ?? '',
    /event 'foo\.bar' has an error and a warning with the code 'bar'/,
  )
  t.regex(
    error?.message ?? '',
    /action_attempt 'LOCK_DOOR' has an error and a warning with the code 'baz'/,
  )
})
