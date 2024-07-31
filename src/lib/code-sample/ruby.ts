import { pascalCase, snakeCase } from 'change-case'

import type { CodeSampleDefinition, Context } from './schema.js'

export const createRubyRequest = (
  { request }: CodeSampleDefinition,
  _context: Context,
): string => {
  const parts = request.path.split('/')
  const params = Object.entries(request.parameters)
    .map(([key, value]) => `${snakeCase(key)}: ${JSON.stringify(value)}`)
    .join(', ')

  return `seam${parts.map((p) => snakeCase(p)).join('.')}(${params})`
}

export const createRubyResponse = (
  { response, title }: CodeSampleDefinition,
  context: Context,
): string => {
  const { endpoint } = context

  if (endpoint.response.responseType === 'void') return 'nil'

  const { responseKey } = endpoint.response
  const responseValue = response?.body?.[responseKey]

  if (responseValue == null) {
    throw new Error(`Missing ${responseKey} for '${title}'`)
  }

  const responseRubyClassName = pascalCase(responseKey)
  const responseRubyParams = Object.entries(responseValue)
    .map(([paramKey, paramValue]) => {
      const formattedValue =
        paramValue === null ? 'nil' : JSON.stringify(paramValue)
      return `  ${snakeCase(paramKey)}=${formattedValue}`
    })
    .join('\n')

  return `<Seam::${responseRubyClassName}:0x00438\n${responseRubyParams}>`
}
