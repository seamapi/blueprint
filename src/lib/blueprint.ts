import type { Openapi } from './openapi.js'

interface Parameter {
  name: string
  type: string
  required: boolean
  description: string
}

interface ReturnValue {
  type: string
  description: string
}

interface Example {
  codeSnippet: string
  explanation: string
}

export interface Blueprint {
  name: string
  routes: {
    path: string
    method: string
    methodDescription: string
    category: string
    parameters: Parameter[]
    returnValue: ReturnValue
    examples: Example[]
  }
}

export interface TypesModule {
  openapi: Openapi
}

export const createBlueprint = ({ openapi }: TypesModule): Blueprint => {
  return {
    name: openapi.info.title,
  }
}
