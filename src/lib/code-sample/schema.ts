import { z } from 'zod'

import type { Endpoint } from 'lib/blueprint.js'
import {
  createSeamCliRequest,
  createSeamCliResponse,
} from 'lib/code-sample/seam-cli.js'
import { JsonSchema } from 'lib/json.js'

import {
  createJavascriptRequest,
  createJavascriptResponse,
} from './javascript.js'
import { createPhpRequest, createPhpResponse } from './php.js'
import { createPythonRequest, createPythonResponse } from './python.js'
import { createRubyRequest, createRubyResponse } from './ruby.js'

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

const syntax = z.enum(['javascript', 'json', 'python', 'php', 'ruby', 'bash'])

const CodeSampleSchema = CodeSampleDefinitionSchema.extend({
  code: z.record(
    z.enum(['javascript', 'python', 'php', 'ruby', 'seam_cli']),
    z.object({
      title: z.string().min(1),
      request: z.string(),
      response: z.string(),
      request_syntax: syntax,
      response_syntax: syntax,
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
        title: 'JavaScript',
        request: createJavascriptRequest(codeSampleDefinition, context),
        response: createJavascriptResponse(codeSampleDefinition, context),
        request_syntax: 'javascript',
        response_syntax: 'javascript',
      },
      python: {
        title: 'Python',
        request: createPythonRequest(codeSampleDefinition, context),
        response: createPythonResponse(codeSampleDefinition, context),
        request_syntax: 'python',
        response_syntax: 'python',
      },
      ruby: {
        title: 'Ruby',
        request: createRubyRequest(codeSampleDefinition, context),
        response: createRubyResponse(codeSampleDefinition, context),
        request_syntax: 'ruby',
        response_syntax: 'ruby',
      },
      php: {
        title: 'PHP',
        request: createPhpRequest(codeSampleDefinition, context),
        response: createPhpResponse(codeSampleDefinition, context),
        request_syntax: 'php',
        response_syntax: 'json',
      },
      seam_cli: {
        title: 'Seam CLI',
        request: createSeamCliRequest(codeSampleDefinition, context),
        response: createSeamCliResponse(codeSampleDefinition, context),
        request_syntax: 'bash',
        response_syntax: 'json',
      },
    },
  }
}
