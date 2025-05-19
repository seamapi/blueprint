import { z } from 'zod'

export const SdkNameSchema = z.enum([
  'javascript',
  'python',
  'php',
  'ruby',
  'seam_cli',
  'go',
  'java',
  'csharp',
  'curl',
])

export const SyntaxNameSchema = z.enum([
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

export type SyntaxName = z.infer<typeof SyntaxNameSchema>

export type SdkName = z.infer<typeof SdkNameSchema>
