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
        },
      },
    },
  },
]
