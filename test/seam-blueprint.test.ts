import { createBlueprint, TypesModuleSchema } from '@seamapi/blueprint'
import * as types from '@seamapi/types/connect'
import test from 'ava'

test('createBlueprint', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule)

  t.is(blueprint.actionAttempts.length, 21)
  for (const actionAttempt of blueprint.actionAttempts) {
    t.true(
      actionAttempt.properties
        .filter((property) => !['error', 'result'].includes(property.name))
        .every((property) => property.actionAttemptStatuses == null),
      `${actionAttempt.actionAttemptType} should keep common properties unannotated`,
    )
  }

  const lockDoor = blueprint.actionAttempts.find(
    ({ actionAttemptType }) => actionAttemptType === 'LOCK_DOOR',
  )
  if (lockDoor == null) {
    t.fail('Expected a LOCK_DOOR action attempt')
    return
  }

  const statusesFor = (propertyName: string) =>
    lockDoor.properties.find(({ name }) => name === propertyName)
      ?.actionAttemptStatuses

  t.deepEqual(statusesFor('error'), ['error'])
  t.deepEqual(statusesFor('result'), ['success'])
  t.snapshot(blueprint, 'blueprint')
})

test('createBlueprint: omits event names from catalog enum projections only', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const hidden = 'access_code.failed_to_issue'
  const documented = 'access_code.created'
  openapi.components.schemas.access_code.properties.unrelated_status = {
    type: 'string',
    enum: [hidden, documented],
  }
  const list = openapi.paths['/events/list'].get
  const timelineOperation = openapi.paths['/access_codes/get_timeline'].get
  // This endpoint is unreleased. Make its projection observable in the filtered output.
  delete timelineOperation['x-undocumented']
  timelineOperation.responses = list.responses
  timelineOperation['x-response-key'] = list['x-response-key']
  list.parameters.push({
    in: 'query',
    name: 'unrelated_status',
    schema: { type: 'string', enum: [hidden, documented] },
  })
  const endpoint = (
    blueprint: Awaited<ReturnType<typeof createBlueprint>>,
    path: string,
  ) =>
    blueprint.routes
      .flatMap(({ endpoints }) => endpoints)
      .find((entry) => entry.path === path)

  for (const omitUndocumented of [false, true]) {
    const blueprint = await createBlueprint(
      { ...typesModule, openapi },
      { omitUndocumented },
    )
    t.is(
      blueprint.events.some(({ eventType }) => eventType === hidden),
      !omitUndocumented,
    )
    t.true(blueprint.events.some(({ eventType }) => eventType === documented))
    const eventType = blueprint.resources
      .find(({ resourceType }) => resourceType === 'event')
      ?.properties.find(({ name }) => name === 'event_type')
    const eventList = endpoint(blueprint, '/events/list')
    const single = eventList?.request.parameters.find(
      ({ name }) => name === 'event_type',
    )
    const timeline = endpoint(
      blueprint,
      '/access_codes/get_timeline',
    )?.request.parameters.find(({ name }) => name === 'event_types')
    const multiple = eventList?.request.parameters.find(
      ({ name }) => name === 'event_types',
    )
    const outside = blueprint.resources
      .find(({ resourceType }) => resourceType === 'access_code')
      ?.properties.find(({ name }) => name === 'unrelated_status')
    const unrelated = eventList?.request.parameters.find(
      ({ name }) => name === 'unrelated_status',
    )
    for (const projection of [eventType, single, timeline, multiple]) {
      const values =
        projection?.format === 'enum'
          ? projection.values
          : projection?.format === 'list' && projection.itemFormat === 'enum'
            ? projection.itemEnumValues
            : []
      t.is(
        values.some(({ name }) => name === hidden),
        !omitUndocumented,
      )
      t.true(values.some(({ name }) => name === documented))
    }
    for (const field of [outside, unrelated]) {
      t.deepEqual(
        field?.format === 'enum'
          ? field.values.map(({ name }) => name)
          : undefined,
        [hidden, documented],
      )
    }
  }
})
