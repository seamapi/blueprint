import type {
  Endpoint,
  Pagination,
  Parameter,
  Property,
  Request,
} from './blueprint.js'
import type { OpenapiSchema } from './openapi/types.js'

export interface Visibility {
  isUndocumented: boolean
  isEndOfLife: boolean
}

export type IsOmitted = (node: Visibility) => boolean

export const schemaVisibility = (
  schema: OpenapiSchema | undefined,
): Visibility => {
  const members = schema?.allOf?.map(schemaVisibility) ?? []
  return {
    isUndocumented: Boolean(
      schema?.['x-undocumented'] ||
      members.some((member) => member.isUndocumented),
    ),
    isEndOfLife: Boolean(
      schema?.['x-end-of-life'] || members.some((member) => member.isEndOfLife),
    ),
  }
}

// Internal annotations for nodes whose public Blueprint shapes have no flag.
export const nodeVisibility = new WeakMap<object, Visibility>()
export const booleanVisibility = new WeakMap<
  Property | Parameter,
  Map<boolean, Visibility>
>()
export const flattenedDiscriminators = new WeakMap<
  Property | Parameter,
  string
>()
export const paginationVisibility = new WeakMap<Pagination, Visibility>()
export const requestVisibility = new WeakMap<
  Request,
  Visibility & { requiredOverride: boolean | undefined }
>()

export interface ResponseField extends Visibility {
  resourceType?: string
  isList: boolean
  children?: Record<string, ResponseField>
}

export const responseVisibility = new WeakMap<
  Endpoint,
  {
    body: Visibility
    fields: Record<string, ResponseField>
  }
>()

export const isNodeOmitted = (node: object, isOmitted: IsOmitted): boolean => {
  const visibility = nodeVisibility.get(node)
  return visibility != null && isOmitted(visibility)
}
