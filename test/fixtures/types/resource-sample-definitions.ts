export default [
  {
    title: 'Get a foo by ID',
    description: 'This is the way to get a foo',
    resource_type: 'foo',
    properties: {
      foo_id: '8d7e0b3a-b889-49a7-9164-4b71a0506a33',
      name: 'Best foo',
      nullable_prop: null,
      number_prop: 10,
      object_prop: {
        foo: 'bar',
        nested_object_prop: {
          foo: 'bar',
        },
      },
      array_prop: ['foo', 'bar'],
    },
  },
]
