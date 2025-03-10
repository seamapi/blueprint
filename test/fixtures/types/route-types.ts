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
        deprecated_prop?: string
        undocumented_prop?: string
        draft_prop?: string
        nullable_prop?: string
        number_prop?: number
        object_prop?: Record<string, string>
        array_prop?: string[]
      }
    }
  }
  '/foos/list': {
    route: '/foos/list'
    method: 'GET' | 'POST'
    queryParams: Record<string, unknown>
    jsonBody: Record<string, unknown>
    commonParams: Record<string, unknown>
    formData: Record<string, unknown>
    jsonResponse: {
      foos: {
        foo_id: string
        name: string
        deprecated_prop?: string
        undocumented_prop?: string
        draft_prop?: string
        nullable_prop?: string
        number_prop?: number
        object_prop?: Record<string, string>
        array_prop?: string[]
      }
      pagination: {
        has_next_page: boolean
      }
    }
  }
  '/transport/air/planes/list': {
    route: '/transport/air/planes/list'
    method: 'GET'
    queryParams: Record<string, unknown>
    jsonBody: Record<string, unknown>
    commonParams: Record<string, unknown>
    formData: Record<string, unknown>
    jsonResponse: {
      planes: {
        plane_id: string
        name: string
      }
    }
  }
  '/deprecated/undocumented/endpoint': {
    route: '/deprecated/undocumented/endpoint'
    method: 'GET'
    queryParams: Record<string, unknown>
    jsonBody: Record<string, unknown>
    commonParams: Record<string, unknown>
    formData: Record<string, unknown>
    jsonResponse: Record<string, never>
  }
  '/draft/endpoint': {
    route: '/draft/endpoint'
    method: 'GET'
    queryParams: Record<string, unknown>
    jsonBody: Record<string, unknown>
    commonParams: Record<string, unknown>
    formData: Record<string, unknown>
    jsonResponse: Record<string, never>
  }
}

export type RouteResponse<Path extends keyof Routes> =
  Routes[Path]['jsonResponse']

export type RouteRequestBody<Path extends keyof Routes> =
  Routes[Path]['jsonBody'] & Routes[Path]['commonParams']

export type RouteRequestParams<Path extends keyof Routes> =
  Routes[Path]['queryParams'] & Routes[Path]['commonParams']
