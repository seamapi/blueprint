import { z } from 'zod'

import type { Endpoint } from 'lib/blueprint.js'
import { JsonSchema } from 'lib/json.js'

import { createSeamCliResourceData } from './seam-cli.js'
import { SdkNameSchema, type SyntaxName, SyntaxNameSchema } from './syntax.js'
import { formatResourceRecords } from './format.js'

export const ResourceSampleDefinitionSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  resource_name: z.string().trim().min(1),
  properties: z.record(z.string().min(1), JsonSchema),
})

export type ResourceSampleDefinitionInput = z.input<
  typeof ResourceSampleDefinitionSchema
>

export type ResourceSampleDefinition = z.output<
  typeof ResourceSampleDefinitionSchema
>

export interface Context {
  endpoint: Omit<Endpoint, 'resourceSamples'>
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
  context: Context,
): Promise<ResourceSample> => {
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
