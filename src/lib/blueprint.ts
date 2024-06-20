import type { Openapi } from './openapi.js'

interface Parameter {
  name: string
  isRequired: boolean
  description: string
}

interface Response {
  description: string
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface Blueprint {
  name: string
  routes: {
    path: string
    method: Method[]
    semanticMethod: Method
    methodDescription: string
    category: string
    parameters: Parameter[]
    response: Response
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
