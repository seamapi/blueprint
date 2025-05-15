import { z, type ZodSchema } from 'zod'

import type { Resource as BlueprintResource } from 'lib/blueprint.js'
import { JsonSchema } from 'lib/json.js'

import { formatResourceRecords } from './format.js'
import { createSeamCliResourceData } from './seam-cli.js'
import { SdkNameSchema, type SyntaxName, SyntaxNameSchema } from './syntax.js'

export const ResourceSampleDefinitionSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  resource_type: z.string().trim().min(1),
  properties: z.record(z.string().min(1), JsonSchema),
})

export type ResourceSampleDefinitionInput = z.input<
  typeof ResourceSampleDefinitionSchema
>

export type ResourceSampleDefinition = z.output<
  typeof ResourceSampleDefinitionSchema
>

export interface ResourceSampleContext {
  resource: Omit<BlueprintResource, 'resourceSamples'>
  schemas: Record<string, unknown>
  formatCode: (content: string, syntax: SyntaxName) => Promise<string>
}

const ResourceSchema = z.record(
  SdkNameSchema,
  z.object({
    title: z.string().min(1),
    resource_data: z.string(),
    resource_data_syntax: SyntaxNameSchema,
  }),
)

export type Resource = z.infer<typeof ResourceSchema>

const ResourceSampleSchema = ResourceSampleDefinitionSchema.extend({
  resource: ResourceSchema,
})

export type ResourceSample = z.output<typeof ResourceSampleSchema>

export const createResourceSample = async (
  resourceSampleDefinition: ResourceSampleDefinition,
  context: ResourceSampleContext,
): Promise<ResourceSample> => {
  const resourceType = resourceSampleDefinition.resource_type
  const schema = toPartialZodSchema(context.schemas[resourceType])
  if (schema != null) {
    const { success, error } = schema.safeParse(
      resourceSampleDefinition.properties,
    )
    if (!success) {
      throw new Error(
        `Invalid properties for resource sample definition of type '${resourceType}': ${error.message}`,
      )
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(`Missing Zod schema for resource ${resourceType}.`)
  }

  const resource: Resource = {
    seam_cli: {
      title: 'Seam CLI',
      resource_data: createSeamCliResourceData(
        resourceSampleDefinition,
        context,
      ),
      resource_data_syntax: 'json',
    },
  }

  return {
    ...resourceSampleDefinition,
    resource: await formatResourceRecords(resource, context),
  }
}

const toPartialZodSchema = (input: unknown): ZodSchema | null => {
  if (typeof input !== 'object') return null
  if (input == null) return null
  if ('deepPartial' in input) return input as unknown as ZodSchema
  return null
}
