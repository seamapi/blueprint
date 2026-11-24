import {
  type Blueprint,
  createBlueprint,
  type Endpoint,
  TypesModuleSchema,
} from '@seamapi/blueprint'
import test, { type ExecutionContext } from 'ava'

import * as types from './fixtures/types/index.js'

test('createBlueprint', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule)
  t.snapshot(blueprint, 'blueprint')
})

test('createBlueprint: with omitUndocumented', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule, {
    omitUndocumented: true,
  })

  t.false(
    blueprint.routes.some((route) => route.isUndocumented),
    'Undocumented routes should be omitted',
  )
  t.false(
    blueprint.routes.some((route) =>
      route.endpoints.some((endpoint) => endpoint.isUndocumented),
    ),
    'Undocumented endpoints should be omitted',
  )
  t.false(
    blueprint.namespaces.some((namespace) => namespace.isUndocumented),
    'Undocumented namespaces should be omitted',
  )
  t.false(
    blueprint.resources.some((resource) => resource.isUndocumented),
    'Undocumented resources should be omitted',
  )
  t.false(
    blueprint.events.some((event) => event.isUndocumented),
    'Undocumented events should be omitted',
  )
  t.false(
    blueprint.actionAttempts.some(
      (actionAttempt) => actionAttempt.isUndocumented,
    ),
    'Undocumented action attempts should be omitted',
  )

  const fooResource = blueprint.resources.find(
    (resource) => resource.resourceType === 'foo',
  )
  t.false(
    fooResource?.properties.some((property) => property.isUndocumented),
    'Undocumented resource properties should be omitted',
  )

  t.snapshot(blueprint, 'blueprint')
})

for (const [kind, option, annotation] of [
  ['error', 'omitUndocumented', 'x-undocumented'],
  ['warning', 'omitUndocumented', 'x-undocumented'],
  ['error', 'omitEndOfLife', 'x-end-of-life'],
] as const) {
  test(`createBlueprint: ${option} filters ${kind} variants and fields`, async (t) => {
    const typesModule = TypesModuleSchema.parse(types)
    const openapi = structuredClone(typesModule.openapi)
    const fooSchema = openapi.components.schemas['foo']
    if (fooSchema?.properties == null) {
      t.fail('Expected foo schema to have properties')
      return
    }

    const code = `${kind}_code`
    const documentedVariant = {
      type: 'object',
      properties: {
        [code]: { type: 'string', enum: ['foo_offline'] },
        message: { type: 'string' },
        internal_detail: { type: 'string', [annotation]: 'Omit this field.' },
      },
      required: [code, 'message'],
      'x-resource-type': 'foo',
      description: 'Public issue.',
    }
    const hiddenVariant = {
      ...documentedVariant,
      properties: {
        ...documentedVariant.properties,
        [code]: { type: 'string', enum: ['foo_unreachable'] },
        hidden_only: { type: 'string' },
      },
      [annotation]: 'Omit this variant.',
    }
    const issuesSchema = {
      type: 'array',
      items: {
        discriminator: { propertyName: code },
        oneOf: [{ allOf: [documentedVariant] }, hiddenVariant],
      },
    }
    fooSchema.properties[`${kind}s`] = issuesSchema
    fooSchema.properties.nested_issues = {
      type: 'object',
      properties: {
        issues: issuesSchema,
        only_hidden: {
          ...issuesSchema,
          items: { ...issuesSchema.items, oneOf: [hiddenVariant] },
        },
      },
    }

    for (const omit of [false, true]) {
      const blueprint = await createBlueprint(
        { ...typesModule, openapi },
        { [option]: omit },
      )
      const properties = blueprint.resources.find(
        ({ resourceType }) => resourceType === 'foo',
      )?.properties
      const issues = properties?.find(({ name }) => name === `${kind}s`)
      if (
        issues?.format !== 'list' ||
        issues.itemFormat !== 'discriminated_object'
      ) {
        t.fail(`Expected ${kind}s to be a discriminated list property`)
        return
      }

      t.is(issues.variants[0]?.resourceType, 'foo')
      t.is(issues.variants[0]?.description, 'Public issue.')
      const codes = issues.variants.map(({ properties }) => {
        const discriminator = properties.find(({ name }) => name === code)
        return discriminator?.format === 'enum'
          ? discriminator.values[0]?.name
          : undefined
      })
      t.deepEqual(
        codes,
        omit ? ['foo_offline'] : ['foo_offline', 'foo_unreachable'],
      )
      t.deepEqual(
        issues.variants[0]?.properties.map(({ name }) => name),
        omit ? [code, 'message'] : [code, 'message', 'internal_detail'],
      )

      const nested = properties?.find(({ name }) => name === 'nested_issues')
      const nestedIssues =
        nested?.format === 'object'
          ? nested.properties.find(({ name }) => name === 'issues')
          : undefined
      const nestedHidden =
        nested?.format === 'object'
          ? nested.properties.find(({ name }) => name === 'only_hidden')
          : undefined
      if (
        nestedIssues?.format !== 'list' ||
        nestedIssues.itemFormat !== 'object' ||
        nestedHidden?.format !== 'list' ||
        nestedHidden.itemFormat !== 'object'
      ) {
        t.fail('Expected the original flattened shape for nested lists')
        return
      }
      const nestedCode = nestedIssues.itemProperties.find(
        ({ name }) => name === code,
      )
      t.deepEqual(
        nestedCode?.format === 'enum'
          ? nestedCode.values.map(({ name }) => name)
          : undefined,
        codes,
      )
      t.is(
        nestedIssues.itemProperties.some(({ name }) => name === 'hidden_only'),
        !omit,
      )
      if (omit) t.deepEqual(nestedHidden.itemProperties, [])
    }
  })
}

for (const method of ['get', 'post'] as const) {
  test(`createBlueprint: filters marked ${method.toUpperCase()} request variants and samples`, async (t) => {
    const typesModule = TypesModuleSchema.parse(types)
    const openapi = structuredClone(typesModule.openapi)
    const pathItem = openapi.paths['/foos/get']
    const operation = pathItem[method]
    delete pathItem[method === 'get' ? 'post' : 'get']
    const variant = (kind: string) => ({
      type: 'object',
      properties: {
        kind: { type: 'string', enum: [kind] },
        public_field: { type: 'string' },
      },
      required: ['kind'],
    })
    const filterList = {
      type: 'array',
      items: {
        discriminator: { propertyName: 'kind' },
        oneOf: [
          variant('public'),
          {
            ...variant('internal'),
            properties: {
              ...variant('internal').properties,
              kind: {
                type: 'string',
                enum: ['internal'],
                'x-enums': {
                  public: { description: 'Public variant.' },
                  internal: { undocumented: 'Internal.' },
                },
              },
            },
          },
        ],
      },
    }
    if (method === 'get') {
      operation.parameters = [
        { in: 'query', name: 'filter_list', schema: filterList },
      ]
    } else {
      operation.requestBody = {
        content: {
          'application/json': {
            schema: { type: 'object', properties: { filter_list: filterList } },
          },
        },
      }
    }
    const sample = typesModule.codeSampleDefinitions.find(
      ({ request }) => request.path === '/foos/get',
    )
    if (sample == null) throw new Error('Missing foo code sample')
    sample.request.parameters = {
      filter_list: [
        { kind: 'public', public_field: 'keep' },
        { kind: 'internal' },
      ],
    }

    for (const omitUndocumented of [false, true]) {
      const blueprint = await createBlueprint(
        { ...typesModule, openapi },
        { omitUndocumented },
      )
      const endpoint = blueprint.routes
        .flatMap(({ endpoints }) => endpoints)
        .find(({ path }) => path === '/foos/get')
      const parameter = endpoint?.request.parameters.find(
        ({ name }) => name === 'filter_list',
      )
      if (parameter?.format !== 'list') {
        throw new Error('Missing filter_list parameter')
      }
      t.is(
        parameter.itemFormat,
        method === 'get' ? 'discriminated_object' : 'object',
      )
      const members =
        parameter.itemFormat === 'discriminated_object'
          ? parameter.variants.flatMap(({ parameters }) => parameters)
          : parameter.itemFormat === 'object'
            ? parameter.itemParameters
            : []
      t.deepEqual(
        members.flatMap((member) =>
          member.name === 'kind' && member.format === 'enum'
            ? member.values.map(({ name }) => name)
            : [],
        ),
        omitUndocumented ? ['public'] : ['public', 'internal'],
      )
      const example = endpoint?.codeSamples[0]
      t.deepEqual(
        example?.request.parameters['filter_list'],
        omitUndocumented
          ? [{ kind: 'public', public_field: 'keep' }]
          : sample.request.parameters['filter_list'],
      )
      t.is(
        example?.code.seam_cli?.request.includes('"kind":"internal"'),
        !omitUndocumented,
      )
    }
  })
}

test('createBlueprint: carries visibility through enum, list and intersection projections', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const hidden = { undocumented: 'Internal.' }
  const status = {
    oneOf: [
      { type: 'string', enum: ['public'] },
      { type: 'string', enum: ['internal'], 'x-enums': { internal: hidden } },
    ],
  }
  const properties = {
    status: structuredClone(status),
    statuses: {
      type: 'array',
      items: structuredClone(status),
      default: ['internal'],
    },
    hidden_items: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['internal'],
        'x-undocumented': 'Internal.',
      },
    },
    hidden_intersection: {
      allOf: [{ type: 'object', 'x-undocumented': 'Internal.' }],
    },
    enabled: {
      type: 'boolean',
      enum: [true, false],
      'x-enums': { true: hidden },
      default: true,
    },
  }
  const operation = openapi.paths['/foos/get'].post
  operation.requestBody = {
    content: {
      'application/json': {
        schema: { type: 'object', properties },
      },
    },
  }
  Object.assign(openapi.components.schemas.foo.properties, properties)
  Object.assign(openapi.components.schemas.pagination.properties, properties)

  const blueprint = await createBlueprint(
    { ...typesModule, openapi },
    { omitUndocumented: true },
  )
  const endpoint = blueprint.routes
    .flatMap(({ endpoints }) => endpoints)
    .find(({ path }) => path === '/foos/get')
  for (const fields of [
    endpoint?.request.parameters,
    blueprint.resources.find(({ resourceType }) => resourceType === 'foo')
      ?.properties,
    blueprint.pagination?.properties,
  ]) {
    t.false(fields?.some(({ name }) => name.startsWith('hidden_')))
    const scalar = fields?.find(({ name }) => name === 'status')
    const list = fields?.find(({ name }) => name === 'statuses')
    const boolean = fields?.find(({ name }) => name === 'enabled')
    t.deepEqual(
      scalar?.format === 'enum' && scalar.values.map(({ name }) => name),
      ['public'],
    )
    t.deepEqual(
      list?.format === 'list' &&
        list.itemFormat === 'enum' &&
        list.itemEnumValues.map(({ name }) => name),
      ['public'],
    )
    t.deepEqual(boolean?.format === 'boolean' && boolean.values, [false])
  }
  for (const name of ['statuses', 'enabled']) {
    t.is(
      endpoint?.request.parameters.find((parameter) => parameter.name === name)
        ?.hasDefault,
      false,
    )
  }
})

test('createBlueprint: omits intersected sample fields without guessing untagged branches', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get'].post
  const variant = (kind: string) => ({
    type: 'object',
    required: ['kind'],
    properties: { kind: { type: 'string', enum: [kind] } },
  })
  const properties = {
    filter: {
      allOf: [
        {
          type: 'object',
          properties: {
            kind: { type: 'string', 'x-undocumented': 'Internal.' },
          },
        },
        {
          oneOf: [
            variant('public'),
            { ...variant('internal'), 'x-undocumented': 'Internal.' },
          ],
        },
      ],
    },
  }
  operation.requestBody = {
    content: { 'application/json': { schema: { type: 'object', properties } } },
  }
  const sample = typesModule.codeSampleDefinitions.find(
    ({ request }) => request.path === '/foos/get',
  )
  if (sample == null) throw new Error('Missing foo code sample')
  const publicSample = structuredClone(sample)
  publicSample.request.parameters = {
    filter: { kind: 'public', payload: 'keep' },
  }
  sample.request.parameters = { filter: { kind: 'internal', payload: 'hide' } }
  typesModule.codeSampleDefinitions.push(publicSample)
  const blueprint = await createBlueprint(
    { ...typesModule, openapi },
    { omitUndocumented: true },
  )
  const endpoint = blueprint.routes
    .flatMap(({ endpoints }) => endpoints)
    .find(({ path }) => path === '/foos/get')
  t.deepEqual(
    endpoint?.codeSamples.map(({ request }) => request.parameters),
    [{ filter: { payload: 'hide' } }, { filter: { payload: 'keep' } }],
  )
})

test('createBlueprint: omits exhausted scalar enums without matching mixed-type branches', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get'].post
  const hidden = 'Internal.'
  const secret = {
    oneOf: ['internal', 'private'].map((value) => ({
      type: 'string',
      enum: [value],
      'x-undocumented': hidden,
    })),
  }
  operation.requestBody = {
    content: {
      'application/json': {
        schema: {
          oneOf: [
            {
              type: 'object',
              required: ['filter'],
              properties: {
                filter: { type: 'string' },
                secret,
                secrets: { type: 'array', items: secret },
              },
            },
            {
              type: 'object',
              'x-undocumented': hidden,
              required: ['filter'],
              properties: { filter: { type: 'object' } },
            },
          ],
        },
      },
    },
  }
  const sample = typesModule.codeSampleDefinitions.find(
    ({ request }) => request.path === '/foos/get',
  )
  if (sample == null) throw new Error('Missing foo code sample')
  const publicSample = structuredClone(sample)
  publicSample.request.parameters = { filter: 'public', secret: 'internal' }
  sample.request.parameters = { filter: { internal: true } }
  typesModule.codeSampleDefinitions.push(publicSample)

  const blueprint = await createBlueprint(
    { ...typesModule, openapi },
    { omitUndocumented: true },
  )
  const endpoint = blueprint.routes
    .flatMap(({ endpoints }) => endpoints)
    .find(({ path }) => path === '/foos/get')
  t.deepEqual(
    endpoint?.request.parameters.map(({ name }) => name),
    ['filter'],
  )
  t.deepEqual(
    endpoint?.codeSamples.map(({ request }) => request.parameters),
    [{ filter: { internal: true } }, { filter: 'public' }],
  )
})

test('createBlueprint: omits marked query wrappers and derives visible requiredness', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const path = '/foos/get'
  const pathItem = openapi.paths[path]
  delete pathItem['post']
  pathItem.get.parameters = [
    {
      in: 'query',
      name: 'hidden',
      required: true,
      schema: { type: 'string' },
      'x-undocumented': 'Internal.',
    },
    { in: 'query', name: 'public', schema: { type: 'string' } },
  ]
  const definition = typesModule.codeSampleDefinitions.find(
    ({ request }) => request.path === path,
  )
  if (definition == null) throw new Error('Missing foo sample')
  definition.request.parameters = { hidden: 'secret', public: 'keep' }
  for (const omitUndocumented of [false, true]) {
    const blueprint = await createBlueprint(
      { ...typesModule, openapi },
      { omitUndocumented },
    )
    const endpoint = blueprint.routes
      .flatMap(({ endpoints }) => endpoints)
      .find((endpoint) => endpoint.path === path)
    t.deepEqual(
      endpoint?.request.parameters.map(({ name }) => name),
      omitUndocumented ? ['public'] : ['hidden', 'public'],
    )
    t.is(endpoint?.request.hasRequiredParameters, !omitUndocumented)
    t.is(
      endpoint?.codeSamples[0]?.request.parameters['hidden'],
      omitUndocumented ? undefined : 'secret',
    )
    t.is(endpoint?.codeSamples[0]?.request.parameters['public'], 'keep')
  }
})

for (const marker of ['component', 'response'] as const) {
  test(`createBlueprint: omits marked pagination (${marker}) and authored example fields`, async (t) => {
    const typesModule = TypesModuleSchema.parse(types)
    const openapi = structuredClone(typesModule.openapi)
    if (marker === 'component') {
      openapi.components.schemas.pagination['x-undocumented'] = 'Internal.'
    } else {
      for (const method of ['get', 'post'] as const) {
        const field =
          openapi.paths['/foos/list'][method].responses['200']?.content?.[
            'application/json'
          ]?.schema.properties?.['pagination']
        if (field == null) throw new Error('Missing pagination response field')
        field['x-undocumented'] = 'Internal.'
      }
    }
    const sample = typesModule.codeSampleDefinitions.find(
      ({ request }) => request.path === '/foos/list',
    )
    const resourceSample = typesModule.resourceSampleDefinitions.find(
      (definition) => definition.resource_type === 'foo',
    )
    if (sample == null || resourceSample == null) {
      throw new Error('Missing foo samples')
    }
    sample.request.parameters = {
      ...sample.request.parameters,
      secret_input: 'private input',
    }
    const operation = openapi.paths['/foos/list'].post
    operation.requestBody = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              secret_input: { type: 'string', 'x-undocumented': 'Internal.' },
            },
          },
        },
      },
    }
    sample.response.body = {
      foos: [{ name: 'Best foo', undocumented_prop: 'private output' }],
      pagination: { has_next_page: false },
    }
    resourceSample.properties['undocumented_prop'] = 'private resource field'

    for (const omitUndocumented of [false, true]) {
      const blueprint = await createBlueprint(
        { ...typesModule, openapi },
        { omitUndocumented },
      )
      const endpoint = blueprint.routes
        .flatMap(({ endpoints }) => endpoints)
        .find(({ path }) => path === '/foos/list')
      const example = endpoint?.codeSamples[0]
      const foo = blueprint.resources.find(
        ({ resourceType }) => resourceType === 'foo',
      )?.resourceSamples[0]
      t.is(
        blueprint.pagination == null,
        omitUndocumented && marker === 'component',
      )
      t.is(endpoint?.hasPagination, !omitUndocumented)
      t.is(
        example?.request.parameters['secret_input'],
        omitUndocumented ? undefined : 'private input',
      )
      t.is(
        example?.code.seam_cli?.request.includes('private input'),
        !omitUndocumented,
      )
      t.is(
        Object.hasOwn(example?.response.body ?? {}, 'pagination'),
        !omitUndocumented,
      )
      t.deepEqual(
        example?.response.body?.['foos'],
        omitUndocumented
          ? [{ name: 'Best foo' }]
          : sample.response.body['foos'],
      )
      t.is(
        example?.code.seam_cli?.response.includes('private output'),
        !omitUndocumented,
      )
      t.is(
        foo?.properties['undocumented_prop'],
        omitUndocumented ? undefined : 'private resource field',
      )
      t.is(
        foo?.resource.seam_cli?.resource_data.includes(
          'private resource field',
        ),
        !omitUndocumented,
      )
      t.is(foo?.properties['name'], 'Best foo')
    }
  })
}

test('createBlueprint: with omitEndOfLife', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule, {
    omitEndOfLife: true,
  })

  const fooResource = blueprint.resources.find(
    (resource) => resource.resourceType === 'foo',
  )
  t.false(
    fooResource?.properties.some((property) => property.isEndOfLife),
    'End of life resource properties should be omitted',
  )
  t.true(
    fooResource?.properties.some((property) => property.isUndocumented),
    'Undocumented resource properties should be kept',
  )

  const fooType = fooResource?.properties.find(
    (property) => property.name === 'foo_type',
  )
  t.false(
    fooType?.format === 'enum' &&
      fooType.values.some((value) => value.isEndOfLife),
    'End of life enum values should be omitted',
  )
})

test('createBlueprint: with formatCode', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const blueprint = await createBlueprint(typesModule, {
    formatCode: async (content, syntax) => [`// ${syntax}`, content].join('\n'),
  })
  t.snapshot(blueprint, 'blueprint')
})

test('createBlueprint: throws when a /seam entry is documented', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  openapi.paths['/seam/widgets/get'] = {
    post: {
      operationId: 'seamWidgetsGetPost',
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  ok: { type: 'boolean' },
                },
                required: ['ok'],
                type: 'object',
              },
            },
          },
          description: 'OK',
        },
      },
      security: [],
      summary: '/seam/widgets/get',
      tags: ['/seam/widgets'],
      'x-response-key': null,
      'x-title': 'Get seam widgets',
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /All \/seam entries must be marked undocumented\. Found: .*\/seam\/widgets\/get/,
  })
})

test('createBlueprint: throws when a documented endpoint response uses an inline resource schema', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (responseProperties?.foo == null) {
    t.fail('Expected /foos/get response schema to exist')
    return
  }

  responseProperties.foo = {
    type: 'object',
    properties: {
      foo_id: { type: 'string', format: 'uuid' },
    },
    required: ['foo_id'],
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /Documented endpoint responses must reference a resource type using \$ref\. Found:\n\/foos\/get response key 'foo' uses an inline schema instead of \$ref/,
  })
})

test('createBlueprint: allows undocumented endpoint responses to use inline resource schemas', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (operation == null || responseProperties?.foo == null) {
    t.fail('Expected /foos/get operation and response schema to exist')
    return
  }

  operation['x-undocumented'] = 'This endpoint is not public.'
  responseProperties.foo = {
    type: 'object',
    properties: {
      foo_id: { type: 'string', format: 'uuid' },
    },
    required: ['foo_id'],
  }

  const blueprint = await createBlueprint({ ...typesModule, openapi })
  const endpoint = blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/foos/get')

  t.true(endpoint?.isUndocumented)
  t.deepEqual(endpoint?.response, {
    actionAttemptType: null,
    batchResourceTypes: null,
    description: 'Get a foo by ID.',
    resourceType: 'unknown',
    responseKey: 'foo',
    responseType: 'resource',
  })
})

test('createBlueprint: resolves documented batch response keys without requiring an outer resource ref', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (operation == null || responseProperties == null) {
    t.fail('Expected /foos/get operation and response schema to exist')
    return
  }

  operation['x-response-key'] = 'batch'
  operation['x-batch-keys'] = ['foos']
  responseProperties.batch = {
    type: 'object',
    properties: {
      foos: {
        type: 'array',
        items: { $ref: '#/components/schemas/foo' },
      },
    },
  }

  const blueprint = await createBlueprint({
    ...typesModule,
    codeSampleDefinitions: [],
    openapi,
  })
  const endpoint = blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/foos/get')

  t.deepEqual(
    endpoint?.response.responseType === 'resource'
      ? endpoint.response.batchResourceTypes
      : null,
    [{ batchKey: 'foos', resourceType: 'foo' }],
  )

  responseProperties.batch.properties.foos['x-undocumented'] = 'Internal.'
  const filtered = await createBlueprint(
    { ...typesModule, codeSampleDefinitions: [], openapi },
    { omitUndocumented: true },
  )
  const batch = filtered.routes
    .flatMap(({ endpoints }) => endpoints)
    .find(({ path }) => path === '/foos/get')?.response
  t.deepEqual(
    batch?.responseType === 'resource' && batch.batchResourceTypes,
    [],
  )

  responseProperties.batch['x-undocumented'] = 'Internal.'
  const hidden = await createBlueprint(
    { ...typesModule, codeSampleDefinitions: [], openapi },
    { omitUndocumented: true },
  )
  t.is(
    hidden.routes
      .flatMap(({ endpoints }) => endpoints)
      .find(({ path }) => path === '/foos/get')?.response.responseType,
    'void',
  )
})

test('createBlueprint: throws when a documented batch key does not resolve using items.$ref', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (operation == null || responseProperties == null) {
    t.fail('Expected /foos/get operation and response schema to exist')
    return
  }

  operation['x-response-key'] = 'batch'
  operation['x-batch-keys'] = ['foos']
  responseProperties.batch = {
    type: 'object',
    properties: {
      foos: {
        type: 'array',
        items: { type: 'object' },
      },
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /\/foos\/get batch key 'foos' does not resolve using items\.\$ref/,
  })
})

test('createBlueprint: throws when a documented endpoint references an unknown resource type', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post
  const responseProperties =
    operation?.responses?.[200]?.content?.['application/json']?.schema
      ?.properties

  if (responseProperties?.foo == null) {
    t.fail('Expected /foos/get response schema to exist')
    return
  }

  responseProperties.foo = {
    $ref: '#/components/schemas/missing_resource',
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /\/foos\/get response key 'foo' references unknown resource type 'missing_resource'/,
  })
})

test('createBlueprint: throws when a documented endpoint references an undocumented resource', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  // Add an undocumented resource
  openapi.components.schemas['secret_widget'] = {
    type: 'object',
    properties: {
      secret_widget_id: { type: 'string', format: 'uuid' },
    },
    required: ['secret_widget_id'],
    'x-undocumented': 'This resource is not yet public.',
    'x-route-path': '/foos',
  }

  // Add a documented endpoint that returns the undocumented resource
  openapi.paths['/widgets/get'] = {
    post: {
      operationId: 'widgetsGetPost',
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  ok: { type: 'boolean' },
                  secret_widget: {
                    $ref: '#/components/schemas/secret_widget',
                  },
                },
                required: ['ok', 'secret_widget'],
                type: 'object',
              },
            },
          },
          description: 'OK',
        },
      },
      security: [],
      summary: '/widgets/get',
      tags: ['/widgets'],
      'x-response-key': 'secret_widget',
      'x-title': 'Get a widget',
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /Documented endpoints must not reference undocumented resources\. Found:\n.*\/widgets\/get.*secret_widget/,
  })
})

test('createBlueprint: throws when a documented resource references an undocumented route', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema == null) {
    t.fail('Expected foo schema to exist')
    return
  }

  fooSchema['x-route-path'] = '/deprecated/undocumented'

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /Documented resources must not reference undocumented routes\. Found:\n.*'foo' references undocumented route '\/deprecated\/undocumented'/,
  })
})

test('createBlueprint: throws when an error code is missing resource_type', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['errors'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'error_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            error_code: {
              type: 'string',
              enum: ['foo_error'],
            },
            message: {
              type: 'string',
            },
          },
          required: ['error_code', 'message'],
        },
      ],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /Missing resource_type for error code foo_error/,
  })
})

test('createBlueprint: throws on duplicate enum values in a property', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['status'] = {
    type: 'string',
    enum: ['active', 'inactive', 'active'],
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /Duplicate enum values for property 'foo\.status': 'active'/,
  })
})

test('createBlueprint: throws on duplicate enum values in a request parameter', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const operation = openapi.paths['/foos/create']?.post
  if (operation == null) {
    t.fail('Expected /foos/create to have a post operation')
    return
  }

  operation.requestBody = {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            manufacturer: {
              type: 'string',
              enum: ['kisi', 'august', 'kisi'],
            },
          },
        },
      },
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /Duplicate enum values for parameter 'manufacturer' in \/foos\/create: 'kisi'/,
  })
})

test('createBlueprint: throws when a resource has an error and a warning with the same code', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['errors'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'error_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            error_code: { type: 'string', enum: ['foo_issue'] },
            message: { type: 'string' },
          },
          required: ['error_code', 'message'],
          'x-resource-type': 'foo',
        },
      ],
    },
  }

  fooSchema.properties['warnings'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'warning_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            warning_code: { type: 'string', enum: ['foo_issue'] },
            message: { type: 'string' },
          },
          required: ['warning_code', 'message'],
        },
      ],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /resource 'foo' has an error and a warning with the code 'foo_issue'/,
  })
})

test('createBlueprint: throws when an error code contains error', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['errors'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'error_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            error_code: { type: 'string', enum: ['error_setting_on_device'] },
            message: { type: 'string' },
          },
          required: ['error_code', 'message'],
          'x-resource-type': 'foo',
        },
      ],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /resource 'foo' has an error with the code 'error_setting_on_device'/,
  })
})

test('createBlueprint: throws when a warning code contains warning', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  fooSchema.properties['warnings'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'warning_code' },
      oneOf: [
        {
          type: 'object',
          properties: {
            warning_code: { type: 'string', enum: ['warning_from_provider'] },
            message: { type: 'string' },
          },
          required: ['warning_code', 'message'],
        },
      ],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /resource 'foo' has a warning with the code 'warning_from_provider'/,
  })
})

test('createBlueprint: throws on duplicate discriminator values across variants', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)

  const fooSchema = openapi.components.schemas['foo']
  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
    return
  }

  const errorVariant = {
    type: 'object',
    properties: {
      error_code: {
        type: 'string',
        enum: ['foo_error'],
      },
      message: {
        type: 'string',
      },
    },
    required: ['error_code', 'message'],
    'x-resource-type': 'foo',
  }

  fooSchema.properties['errors'] = {
    type: 'array',
    items: {
      discriminator: { propertyName: 'error_code' },
      oneOf: [errorVariant, structuredClone(errorVariant)],
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /Duplicate error_code values for 'foo\.errors': 'foo_error'/,
  })
})

test('createBlueprint: throws when a request parameter does not define a type', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const createOperation = openapi.paths['/foos/create']?.post

  if (createOperation == null) {
    t.fail('Expected the /foos/create post operation in the fixture')
    return
  }

  createOperation.requestBody = {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { untyped_param: { description: 'No type here.' } },
        },
      },
    },
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /The untyped_param property for \/foos\/create cannot be documented since it does not define a type/,
  })
})

test('createBlueprint: throws when a nested property does not define a type', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const successVariant =
    openapi.components?.schemas?.action_attempt?.oneOf?.find(
      (variant: { properties?: { status?: { enum?: string[] } } }) =>
        variant.properties?.status?.enum?.[0] === 'success',
    )

  if (successVariant?.properties?.result?.properties == null) {
    t.fail('Expected the succeeded action attempt result in the fixture')
    return
  }

  successVariant.properties.result.properties.untyped_property = {
    description: 'No type here.',
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message:
      /The untyped_property property for action_attempt.result cannot be documented since it does not define a type/,
  })
})

test('createBlueprint: throws when an endpoint exposes more than two methods', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const createOperation = openapi.paths['/foos/create']?.post

  if (createOperation == null) {
    t.fail('Expected the /foos/create post operation in the fixture')
    return
  }

  openapi.paths['/foos/replace'] = {
    post: structuredClone(createOperation),
    patch: structuredClone(createOperation),
    put: structuredClone(createOperation),
  }

  await t.throwsAsync(() => createBlueprint({ ...typesModule, openapi }), {
    message: /More than two methods detected for \/foos\/replace/,
  })
})

test('createBlueprint: allows more than two methods on exempt endpoints', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const createOperation = openapi.paths['/foos/create']?.post

  if (createOperation == null) {
    t.fail('Expected the /foos/create post operation in the fixture')
    return
  }

  openapi.paths['/access_codes/update'] = {
    post: structuredClone(createOperation),
    patch: structuredClone(createOperation),
    put: structuredClone(createOperation),
  }

  const blueprint = await createBlueprint({ ...typesModule, openapi })
  const endpoint = blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/access_codes/update')

  // Methods are ordered by name, not by how the spec listed them.
  t.deepEqual(endpoint?.request.methods, ['PATCH', 'POST', 'PUT'])
})

test('createBlueprint: builds an endpoint from a semantic-method spec without a post operation', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const foosGetPathItem = openapi.paths['/foos/get']

  if (foosGetPathItem?.get == null) {
    t.fail('Expected the /foos/get get operation in the fixture')
    return
  }

  foosGetPathItem.get.parameters = [
    {
      name: 'foo_id',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ]
  delete foosGetPathItem.post

  const blueprint = await createBlueprint({ ...typesModule, openapi })
  const endpoint = blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/foos/get')

  t.deepEqual(endpoint?.request.methods, ['GET', 'POST'])
  t.is(endpoint?.request.semanticMethod, 'GET')

  const fooIdParameter = endpoint?.request.parameters.find(
    ({ name }) => name === 'foo_id',
  )
  t.is(fooIdParameter?.isRequired, true)
  t.true(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: a semantic-method spec produces the same endpoint as a post-mirrored spec', async (t) => {
  const typesModule = TypesModuleSchema.parse(types)

  const mirroredOpenapi = structuredClone(typesModule.openapi)
  const mirroredPathItem = mirroredOpenapi.paths['/foos/get']

  if (mirroredPathItem?.get == null || mirroredPathItem.post == null) {
    t.fail('Expected the /foos/get get and post operations in the fixture')
    return
  }

  mirroredPathItem.get.parameters = [
    {
      name: 'foo_id',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ]
  mirroredPathItem.post.requestBody = {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { foo_id: { type: 'string', format: 'uuid' } },
          required: ['foo_id'],
        },
      },
    },
  }

  const semanticOpenapi = structuredClone(mirroredOpenapi)
  const semanticPathItem = semanticOpenapi.paths['/foos/get']

  if (semanticPathItem == null) {
    t.fail('Expected the /foos/get path in the fixture')
    return
  }

  delete semanticPathItem.post

  const findFoosGetEndpoint = (blueprint: Blueprint): Endpoint | undefined =>
    blueprint.routes
      .flatMap((route) => route.endpoints)
      .find(({ path }) => path === '/foos/get')

  const mirroredEndpoint = findFoosGetEndpoint(
    await createBlueprint({ ...typesModule, openapi: mirroredOpenapi }),
  )
  const semanticEndpoint = findFoosGetEndpoint(
    await createBlueprint({ ...typesModule, openapi: semanticOpenapi }),
  )

  t.truthy(mirroredEndpoint)
  t.deepEqual(semanticEndpoint, mirroredEndpoint)
})

const createBlueprintWithFoosGetRequestBody = async (
  t: ExecutionContext,
  schema: Record<string, unknown>,
  hasRequiredParameters?: boolean,
): Promise<Endpoint | undefined> => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const operation = openapi.paths['/foos/get']?.post

  if (operation == null) {
    t.fail('Expected the /foos/get post operation in the fixture')
  }

  operation.requestBody = { content: { 'application/json': { schema } } }

  if (hasRequiredParameters != null) {
    operation['x-has-required-parameters'] = hasRequiredParameters
  }

  const blueprint = await createBlueprint({ ...typesModule, openapi })

  return blueprint.routes
    .flatMap((route) => route.endpoints)
    .find(({ path }) => path === '/foos/get')
}

test('createBlueprint: hasRequiredParameters is false when every parameter is optional', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(t, {
    type: 'object',
    properties: { foo_id: { type: 'string' }, name: { type: 'string' } },
  })

  t.false(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: hasRequiredParameters is true when a parameter is required', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(t, {
    type: 'object',
    properties: { foo_id: { type: 'string' } },
    required: ['foo_id'],
  })

  t.true(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: hasRequiredParameters is true when every union variant requires a parameter', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(t, {
    oneOf: [
      {
        type: 'object',
        properties: { foo_id: { type: 'string' } },
        required: ['foo_id'],
      },
      {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    ],
  })

  t.deepEqual(
    endpoint?.request.parameters.map(({ name, isRequired }) => ({
      name,
      isRequired,
    })),
    [
      { name: 'foo_id', isRequired: false },
      { name: 'name', isRequired: false },
    ],
  )
  t.true(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: hasRequiredParameters honors the annotation when all parameters are optional', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(
    t,
    {
      type: 'object',
      properties: { foo_id: { type: 'string' }, name: { type: 'string' } },
    },
    true,
  )

  t.true(endpoint?.request.hasRequiredParameters)
})

test('createBlueprint: throws when the annotation contradicts a required parameter', async (t) => {
  await t.throwsAsync(
    async () =>
      await createBlueprintWithFoosGetRequestBody(
        t,
        {
          type: 'object',
          properties: { foo_id: { type: 'string' } },
          required: ['foo_id'],
        },
        false,
      ),
    {
      message:
        /\/foos\/get sets 'x-has-required-parameters: false' but requires foo_id/,
    },
  )
})

const createBlueprintWithFooProperties = async (
  t: ExecutionContext,
  properties: Record<string, unknown>,
): Promise<Blueprint> => {
  const typesModule = TypesModuleSchema.parse(types)
  const openapi = structuredClone(typesModule.openapi)
  const fooSchema = openapi.components.schemas['foo']

  if (fooSchema?.properties == null) {
    t.fail('Expected foo schema to have properties')
  }

  Object.assign(fooSchema.properties, properties)
  return await createBlueprint({ ...typesModule, openapi })
}

test('createBlueprint: preserves boolean enum constraints on resource properties', async (t) => {
  const blueprint = await createBlueprintWithFooProperties(t, {
    true_literal: { type: 'boolean', enum: [true] },
    false_literal: { type: 'boolean', enum: [false] },
    multiple_literals: { type: 'boolean', enum: [true, false] },
    unconstrained_boolean: { type: 'boolean' },
  })

  const properties = blueprint.resources.find(
    ({ resourceType }) => resourceType === 'foo',
  )?.properties
  const trueLiteral = properties?.find(({ name }) => name === 'true_literal')
  const falseLiteral = properties?.find(({ name }) => name === 'false_literal')
  const multipleLiterals = properties?.find(
    ({ name }) => name === 'multiple_literals',
  )
  const unconstrainedBoolean = properties?.find(
    ({ name }) => name === 'unconstrained_boolean',
  )

  if (
    trueLiteral?.format !== 'boolean' ||
    falseLiteral?.format !== 'boolean' ||
    multipleLiterals?.format !== 'boolean' ||
    unconstrainedBoolean?.format !== 'boolean'
  ) {
    t.fail('Expected all test properties to be booleans')
    return
  }

  t.deepEqual(trueLiteral.values, [true])
  t.deepEqual(falseLiteral.values, [false])
  t.is(
    falseLiteral.values?.[0],
    false,
    'Expected the false literal to be retained',
  )
  t.deepEqual(multipleLiterals.values, [true, false])
  t.false('values' in unconstrainedBoolean)
})

test('createBlueprint: preserves boolean constraints on request parameters independently of defaults', async (t) => {
  const endpoint = await createBlueprintWithFoosGetRequestBody(t, {
    type: 'object',
    properties: {
      include_unmanaged: { type: 'boolean', enum: [false] },
      use_cache: { type: 'boolean', default: false },
    },
  })
  const includeUnmanaged = endpoint?.request.parameters.find(
    ({ name }) => name === 'include_unmanaged',
  )
  const useCache = endpoint?.request.parameters.find(
    ({ name }) => name === 'use_cache',
  )

  if (includeUnmanaged?.format !== 'boolean') {
    t.fail('Expected include_unmanaged to be a boolean parameter')
    return
  }
  if (useCache?.format !== 'boolean') {
    t.fail('Expected use_cache to be a boolean parameter')
    return
  }

  t.deepEqual(includeUnmanaged.values, [false])
  t.false('values' in useCache)
  t.true(useCache.hasDefault)
  t.is(useCache.default, false)
})

test('createBlueprint: preserves boolean constraints in nested and flattened schemas', async (t) => {
  const blueprint = await createBlueprintWithFooProperties(t, {
    status_updates: {
      type: 'array',
      items: {
        discriminator: { propertyName: 'kind' },
        oneOf: [
          {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['connected_account'] },
              is_connected_account_error: {
                type: 'boolean',
                enum: [true],
              },
            },
            required: ['kind', 'is_connected_account_error'],
          },
        ],
      },
    },
    scalar_union: {
      oneOf: [
        { type: 'boolean', enum: [true] },
        { type: 'boolean', enum: [false] },
      ],
    },
    all_of_flags: {
      allOf: [
        {
          type: 'object',
          properties: {
            is_enabled: { type: 'boolean', enum: [true] },
          },
        },
        {
          type: 'object',
          properties: {
            is_enabled: { type: 'boolean', enum: [false] },
          },
        },
      ],
    },
    one_of_flags: {
      oneOf: [
        {
          type: 'object',
          properties: {
            is_enabled: { type: 'boolean', enum: [true] },
          },
        },
        {
          type: 'object',
          properties: {
            is_enabled: { type: 'boolean', enum: [false] },
          },
        },
      ],
    },
  })

  const properties = blueprint.resources.find(
    ({ resourceType }) => resourceType === 'foo',
  )?.properties
  const statusUpdates = properties?.find(
    ({ name }) => name === 'status_updates',
  )
  if (
    statusUpdates?.format !== 'list' ||
    statusUpdates.itemFormat !== 'discriminated_object'
  ) {
    t.fail('Expected status_updates to be a discriminated list property')
    return
  }

  const variantProperties = statusUpdates.variants[0]?.properties
  const nestedBoolean = variantProperties?.find(
    ({ name }) => name === 'is_connected_account_error',
  )
  const kind = variantProperties?.find(({ name }) => name === 'kind')
  if (nestedBoolean?.format !== 'boolean' || kind?.format !== 'enum') {
    t.fail('Expected boolean and string discriminants to retain their formats')
    return
  }

  t.deepEqual(nestedBoolean.values, [true])
  t.deepEqual(
    kind.values.map(({ name }) => name),
    ['connected_account'],
  )

  const scalarUnion = properties?.find(({ name }) => name === 'scalar_union')
  if (scalarUnion?.format !== 'boolean') {
    t.fail('Expected scalar_union to be a boolean property')
    return
  }
  t.deepEqual(scalarUnion.values, [true, false])

  for (const name of ['all_of_flags', 'one_of_flags']) {
    const container = properties?.find((property) => property.name === name)
    if (container?.format !== 'object') {
      t.fail(`Expected ${name} to be an object property`)
      continue
    }

    const nestedProperty = container.properties.find(
      ({ name }) => name === 'is_enabled',
    )
    if (nestedProperty?.format !== 'boolean') {
      t.fail(`Expected ${name}.is_enabled to be a boolean property`)
      continue
    }

    t.deepEqual(nestedProperty.values, [true, false])
  }
})
