import { z } from 'zod'

import type { Endpoint } from 'lib/blueprint.js'
import { JsonSchema } from 'lib/json.js'

import {
  createJavascriptRequest,
  createJavascriptResponse,
} from './javascript.js'
import { createPythonRequest, createPythonResponse } from './python.js'
import { createPhpRequest, createPhpResponse } from './php.js'

export const CodeSampleDefinitionSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  request: z.object({
    path: z
      .string()
      .startsWith('/')
      .regex(
        /^[a-z_/]+$/,
        'Can only contain the lowercase letters a-z, underscores, and forward slashes.',
      ),
    parameters: z.record(z.string().min(1), JsonSchema),
  }),
  response: z.object({
    body: z.record(z.string().min(1), JsonSchema).nullable(),
  }),
})

export type CodeSampleDefinitionInput = z.input<
  typeof CodeSampleDefinitionSchema
>

export type CodeSampleDefinition = z.output<typeof CodeSampleDefinitionSchema>

const CodeSampleSchema = CodeSampleDefinitionSchema.extend({
  code: z.record(
    z.enum(['javascript', 'python', 'php']),
    z.object({
      request: z.string(),
      response: z.string(),
    }),
  ),
})

export type CodeSample = z.output<typeof CodeSampleSchema>

export interface Context {
  endpoint: Omit<Endpoint, 'codeSamples'>
}

export const createCodeSample = (
  codeSampleDefinition: CodeSampleDefinition,
  context: Context,
): CodeSample => {
  return {
    ...codeSampleDefinition,
    code: {
      javascript: {
        request: createJavascriptRequest(codeSampleDefinition, context),
        response: createJavascriptResponse(codeSampleDefinition, context),
      },
      python: {
        request: createPythonRequest(codeSampleDefinition, context),
        response: createPythonResponse(codeSampleDefinition, context),
      },
      php: {
        request: createPhpRequest(codeSampleDefinition, context),
        response: createPhpResponse(codeSampleDefinition, context),
      },
    },
  }
}
