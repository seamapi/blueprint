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

  const result = blueprint.actionAttempts
    .find(({ actionAttemptType }) => actionAttemptType === 'ASSIGN_CREDENTIAL')
    ?.properties.find(({ name }) => name === 'result')
  const nestedMutations =
    result?.format === 'object'
      ? result.properties.find(({ name }) => name === 'pending_mutations')
      : undefined
  const directMutations = blueprint.resources
    .find(({ resourceType }) => resourceType === 'access_method')
    ?.properties.find(({ name }) => name === 'pending_mutations')

  t.is(
    nestedMutations?.format === 'list' && nestedMutations.itemFormat,
    'object',
  )
  t.is(
    directMutations?.format === 'list' && directMutations.itemFormat,
    'discriminated_object',
  )
  t.snapshot(blueprint, 'blueprint')
})
