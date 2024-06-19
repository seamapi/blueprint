import type { Openapi } from './openapi.js'

export interface Blueprint {
  name: string
  language: string
  methodDescription: string 
  versionInformation: string 
  category: string // e.g. Devices, Access Codes, Locks, etc.
  parameters: Array<{
    name: string 
    type: string 
    optionality: 'optional' | 'required' 
    description: string 
  }>
  returnValue: {
    type: string 
    description: string 
  }
  examples: Array<{
    codeSnippet: string 
    explanation: string 
  }>
}

export interface TypesModule {
  openapi: Openapi
}

export const createBlueprint = ({ openapi }: TypesModule): Blueprint => {
  return {
    name: openapi.info.title,
  }
}
