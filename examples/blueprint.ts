import type { Builder, Command, Describe, Handler } from 'landlubber'

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
  logger.info({ data: createBlueprint(types) }, 'blueprint')
}
