import { z } from 'zod'

export const CodeSampleSdkSchema = z.enum([
  'javascript',
  'python',
  'php',
  'ruby',
  'seam_cli',
  'go',
  'java',
  'csharp',
])

export const CodeSampleSyntaxSchema = z.enum([
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
