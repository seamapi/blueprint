export interface Openapi {
  openapi: string
  info: {
    title: string
    version: string
  }
  servers: Array<{
    url: string
  }>
  tags: Array<{
    name: string
    description: string
  }>
  components: {
    schemas: Record<
      string,
      {
        type: string
        properties: Record<
          string,
          {
            description: string
            type: string
            format?: string
          }
        >
        required: string[]
      }
    >
  }
  paths: Record<
    string,
    {
      [method in 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH']?: {
        operationId: string
        responses: Record<
          string,
          {
            description: string
            content?: Record<
              string,
              {
                schema: {
                  properties: Record<
                    string,
                    {
                      type: string
                      $ref?: string
                    }
                  >
                  required: string[]
                  type: string
                }
              }
            >
          }
        >
        summary?: string
        tags?: string[]
      }
    }
  >
}