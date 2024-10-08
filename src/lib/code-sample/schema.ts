import { z } from 'zod'

import type { Endpoint } from 'lib/blueprint.js'
import {
  createSeamCliRequest,
  createSeamCliResponse,
} from 'lib/code-sample/seam-cli.js'
import { JsonSchema } from 'lib/json.js'

import { createCsharpRequest, createCsharpResponse } from './csharp.js'
import { formatCodeRecords } from './format.js'
import { createGoRequest, createGoResponse } from './go.js'
import { createJavaRequest, createJavaResponse } from './java.js'
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
    parameters: z.record(z.string().min(1), JsonSchema).optional().default({}),
  }),
  response: z.object({
    body: z.record(z.string().min(1), JsonSchema).nullable(),
  }),
})

export type CodeSampleDefinitionInput = z.input<
  typeof CodeSampleDefinitionSchema
>

export type CodeSampleDefinition = z.output<typeof CodeSampleDefinitionSchema>

const CodeSampleSdkSchema = z.enum([
  'javascript',
  'python',
  'php',
  'ruby',
  'seam_cli',
  'go',
  'java',
  'csharp',
])

const CodeSampleSyntaxSchema = z.enum([
  'javascript',
  'json',
  'python',
  'php',
  'ruby',
  'bash',
  'go',
  'java',
  'csharp',
])

export type CodeSampleSyntax = z.infer<typeof CodeSampleSyntaxSchema>

export type CodeSampleSdk = z.infer<typeof CodeSampleSdkSchema>

const CodeSchema = z.record(
  CodeSampleSdkSchema,
  z.object({
    title: z.string().min(1),
    request: z.string(),
    response: z.string(),
    request_syntax: CodeSampleSyntaxSchema,
    response_syntax: CodeSampleSyntaxSchema,
  }),
)

export type Code = z.infer<typeof CodeSchema>

const CodeSampleSchema = CodeSampleDefinitionSchema.extend({
  code: CodeSchema,
})

export type CodeSample = z.output<typeof CodeSampleSchema>

export interface Context {
  endpoint: Omit<Endpoint, 'codeSamples'>
  formatCode: (content: string, syntax: CodeSampleSyntax) => Promise<string>
}

export const createCodeSample = async (
  codeSampleDefinition: CodeSampleDefinition,
  context: Context,
): Promise<CodeSample> => {
  const isVoidResponse = context.endpoint.response.responseType === 'void'
  const code: Code = {
    javascript: {
      title: 'JavaScript',
      request: createJavascriptRequest(codeSampleDefinition, context),
      response: isVoidResponse
        ? '// void'
        : createJavascriptResponse(codeSampleDefinition, context),
      request_syntax: 'javascript',
      response_syntax: isVoidResponse ? 'javascript' : 'json',
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
      response_syntax: 'php',
    },
    seam_cli: {
      title: 'Seam CLI',
      request: createSeamCliRequest(codeSampleDefinition, context),
      response: createSeamCliResponse(codeSampleDefinition, context),
      request_syntax: 'bash',
      response_syntax: 'json',
    },
    go: {
      title: 'Go',
      request: createGoRequest(codeSampleDefinition, context),
      response: createGoResponse(codeSampleDefinition, context),
      request_syntax: 'go',
      response_syntax: 'go',
    },
    java: {
      title: 'Java',
      request: createJavaRequest(codeSampleDefinition, context),
      response: createJavaResponse(codeSampleDefinition, context),
      request_syntax: 'java',
      response_syntax: 'json',
    },
    csharp: {
      title: 'C#',
      request: createCsharpRequest(codeSampleDefinition, context),
      response: createCsharpResponse(codeSampleDefinition, context),
      request_syntax: 'csharp',
      response_syntax: 'json',
    },
  }

  return {
    ...codeSampleDefinition,
    code: await formatCodeRecords(code, context),
  }
}
