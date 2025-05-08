import type { Code, Context } from './code-sample.js'

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

type Entries<T> = Array<
  {
    [K in keyof T]: [K, T[K]]
  }[keyof T]
>
