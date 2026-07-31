import test from 'ava'

import type {
  ActionAttempt,
  EventResource,
  Property,
  Resource,
} from 'lib/blueprint.js'
import {
  assertResourceErrorAndWarningCodesDontHaveRedundantSuffixes,
  assertResourceErrorAndWarningCodesDontOverlap,
} from 'lib/validate-error-and-warning-codes.js'

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

test('assertResourceErrorAndWarningCodesDontHaveRedundantSuffixes: passes when codes have no redundant suffix', (t) => {
  t.notThrows(() => {
    assertResourceErrorAndWarningCodesDontHaveRedundantSuffixes({
      resources: [
        createResource('foo', ['device_offline'], ['being_deleted', 'error']),
      ],
      events: [],
      actionAttempts: [],
    })
  })
})

test('assertResourceErrorAndWarningCodesDontHaveRedundantSuffixes: throws on codes ending with _error or _warning', (t) => {
  const error = t.throws(
    () => {
      assertResourceErrorAndWarningCodesDontHaveRedundantSuffixes({
        resources: [
          createResource(
            'foo',
            ['device_offline', 'provider_error'],
            ['being_deleted', 'provider_warning'],
          ),
        ],
        events: [],
        actionAttempts: [],
      })
    },
    { message: /must not end with '_error' or '_warning'/ },
  )

  t.regex(
    error?.message ?? '',
    /resource 'foo' has an error with the code 'provider_error'/,
  )
  t.regex(
    error?.message ?? '',
    /resource 'foo' has a warning with the code 'provider_warning'/,
  )
  t.notRegex(error?.message ?? '', /device_offline|being_deleted/)
})
