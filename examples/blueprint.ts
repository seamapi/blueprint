import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Builder, Command, Describe, Handler } from 'landlubber'
import { mkdirp } from 'mkdirp'

import { createBlueprint, TypesModuleSchema } from '@seamapi/blueprint'

interface Options {
  moduleName: string
}

export const command: Command = 'blueprint [moduleName]'

export const describe: Describe = 'Create a blueprint from a module'

export const builder: Builder = {
  moduleName: {
    type: 'string',
    default: '@seamapi/types/connect',
    describe: 'Module name or path to import',
  },
}

export const handler: Handler<Options> = async ({ moduleName, logger }) => {
  const types = TypesModuleSchema.parse(await import(moduleName))
  const blueprint = await createBlueprint(types)
  const blueprintPath = join('tmp', 'blueprint.json')
  logger.info({ blueprint: blueprintPath }, 'blueprint')
  await mkdirp('tmp')
  await writeFile(blueprintPath, JSON.stringify(blueprint))
}
