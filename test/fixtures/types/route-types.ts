export interface Routes {
  '/foos/get': {
    route: '/foos/get'
    method: 'GET' | 'POST'
    queryParams: Record<string, unknown>
    jsonBody: Record<string, unknown>
    commonParams: Record<string, unknown>
    formData: Record<string, unknown>
    jsonResponse: {
      foo: {
        foo_id: string
        name: string
      }
    }
  }
}

export type RouteResponse<Path extends keyof Routes> =
  Routes[Path]['jsonResponse']

export type RouteRequestBody<Path extends keyof Routes> =
  Routes[Path]['jsonBody'] & Routes[Path]['commonParams']

export type RouteRequestParams<Path extends keyof Routes> =
  Routes[Path]['queryParams'] & Routes[Path]['commonParams']
