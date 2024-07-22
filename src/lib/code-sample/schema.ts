import { z } from 'zod'

import {
  createJavascriptRequest,
  createJavascriptResponse,
} from './javascript.js'

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
    parameters: z.record(z.string().min(1), z.any()),
  }),
  response: z
    .object({
      body: z.record(z.string().min(1), z.any()),
    })
    .nullable(),
})

export type CodeSampleDefinitionInput = z.input<
  typeof CodeSampleDefinitionSchema
>

export type CodeSampleDefinition = z.output<typeof CodeSampleDefinitionSchema>

const CodeSampleSchema = CodeSampleDefinitionSchema.extend({
  code: z.record(
    z.enum(['javascript']),
    z.object({
      request: z.string(),
      response: z.string(),
    }),
  ),
})

export type CodeSample = z.output<typeof CodeSampleSchema>

export const createCodeSample = (
  codeSampleDefinition: CodeSampleDefinition,
): CodeSample => {
  return {
    ...codeSampleDefinition,
    code: {
      javascript: {
        request: createJavascriptRequest(codeSampleDefinition.request),
        response: createJavascriptResponse(codeSampleDefinition.response),
      },
    },
  }
}
