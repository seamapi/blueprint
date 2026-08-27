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
