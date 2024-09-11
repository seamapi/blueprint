export default [
  {
    title: 'Get a foo by ID',
    description: 'This is the way to get a foo',
    request: {
      path: '/foos/get',
      parameters: {
        foo_id: '8d7e0b3a-b889-49a7-9164-4b71a0506a33',
      },
    },
    response: {
      body: {
        foo: {
          foo_id: '8d7e0b3a-b889-49a7-9164-4b71a0506a33',
          name: 'Best foo',
          nullable_property: null,
        },
      },
    },
  },
  {
    title: 'List foos',
    description: 'This is the way to list foos',
    request: {
      path: '/foos/list',
      parameters: {},
    },
    response: {
      body: {
        foos: [
          {
            foo_id: '8d7e0b3a-b889-49a7-9164-4b71a0506a33',
            name: 'Best foo',
            nullable_property: null,
          },
        ],
      },
    },
  },
  {
    title: 'List planes',
    description: 'This is the wya to get all plans',
    request: {
      path: '/transport/air/planes/list',
      parameters: {},
    },
    response: {
      body: {
        planes: [
          {
            plane_id: '9d3163f9-9185-40d3-a0ce-a03d3c7ce402',
            name: 'Woosh',
          },
        ],
      },
    },
  },
]
