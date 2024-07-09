import { openapi } from '@seamapi/types/connect'
import test from 'ava'

import { createBlueprint } from '@seamapi/blueprint'

test('createBlueprint', (t) => {
  // @ts-expect-error Remove once the import is properly typed
  const blueprint = createBlueprint({ openapi })
  t.snapshot(blueprint, 'blueprint')
})
