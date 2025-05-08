import type { Code, Context } from './code-sample.js'
import type { Resource } from './resource-sample.js'

type CodeEntries = Entries<Code>
type CodeEntry = NonNullable<CodeEntries[number]>

export const formatCodeRecords = async (
  code: Code,
  context: Context,
): Promise<Code> => {
  const entries = Object.entries(code) as unknown as CodeEntries
  const formattedEntries = await Promise.all(
    entries.map(async (entry): Promise<CodeEntry> => {
      if (entry == null) throw new Error('Unexpected null code entry')
      return await formatCodeEntry(entry, context)
    }),
  )
  return Object.fromEntries(formattedEntries)
}

const formatCodeEntry = async (
  [key, code]: CodeEntry,
  { formatCode }: Context,
): Promise<CodeEntry> => {
  if (code == null) throw new Error(`Unexpected null in code object for ${key}`)
  const [request, response] = await Promise.all([
    await formatCode(code.request, code.request_syntax),
    await formatCode(code.response, code.response_syntax),
  ])
  return [
    key,
    {
      ...code,
      request,
      response,
    },
  ]
}

type ResourceEntries = Entries<Resource>
type ResourceEntry = NonNullable<ResourceEntries[number]>

export const formatResourceRecords = async (
  resource: Resource,
  context: Context,
): Promise<Resource> => {
  const entries = Object.entries(resource) as unknown as ResourceEntries
  const formattedEntries = await Promise.all(
    entries.map(async (entry): Promise<ResourceEntry> => {
      if (entry == null) throw new Error('Unexpected null resource entry')
      return await formatResourceEntry(entry, context)
    }),
  )
  return Object.fromEntries(formattedEntries)
}

const formatResourceEntry = async (
  [key, resource]: ResourceEntry,
  { formatCode }: Context,
): Promise<ResourceEntry> => {
  if (resource == null) {
    throw new Error(`Unexpected null in resource object for ${key}`)
  }
  const resourceData = await formatCode(
    resource.resource_data,
    resource.resource_data_syntax,
  )
  return [
    key,
    {
      ...resource,
      resource_data: resourceData,
    },
  ]
}

type Entries<T> = Array<
  {
    [K in keyof T]: [K, T[K]]
  }[keyof T]
>
