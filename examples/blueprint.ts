import type { Builder, Command, Describe, Handler } from 'landlubber'

import { createBlueprint, type TypesModule } from '@seamapi/blueprint'

interface Options {
  moduleName: string
}

export const command: Command = 'blueprint [moduleName]'

export const describe: Describe = 'Create a blueprint from a type module'

export const builder: Builder = {
  moduleName: {
    type: 'string',
    default: '@seamapi/types/connect',
    describe: 'Module name or path to import',
  },
}

export const handler: Handler<Options> = async ({ moduleName, logger }) => {
  const types = (await import(moduleName)) as TypesModule
  logger.info({ data: createBlueprint(types) }, 'blueprint')
}
