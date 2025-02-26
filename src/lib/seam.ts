import type { KnownOpenapiAuthMethod } from './openapi/types.js'

export const seamRoutelessResources = ['pagination']

export type SeamWorkspaceScope = 'none' | 'optional' | 'required'

export type SeamAuthMethod =
  | 'api_key'
  | 'personal_access_token'
  | 'console_session_token'
  | 'client_session_token'
  | 'publishable_key'

export const mapOpenapiToSeamAuthMethod = (
  method: string,
): SeamAuthMethod | undefined => {
  const AUTH_METHOD_MAPPING: Record<KnownOpenapiAuthMethod, SeamAuthMethod> = {
    api_key: 'api_key',
    pat_with_workspace: 'personal_access_token',
    pat_without_workspace: 'personal_access_token',
    console_session_token_with_workspace: 'console_session_token',
    console_session_token_without_workspace: 'console_session_token',
    client_session: 'client_session_token',
    publishable_key: 'publishable_key',
  } as const

  return AUTH_METHOD_MAPPING[method as KnownOpenapiAuthMethod]
}
