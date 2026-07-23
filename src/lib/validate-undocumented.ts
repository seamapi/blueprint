import type { Blueprint } from './blueprint.js'

const isSeamPath = (path: string): boolean =>
  path === '/seam' || path.startsWith('/seam/')

export const assertSeamPathsAreUndocumented = ({
  routes,
  namespaces,
  resources,
  events,
  actionAttempts,
}: Pick<
  Blueprint,
  'routes' | 'namespaces' | 'resources' | 'events' | 'actionAttempts'
>): void => {
  const offenders = [
    ...routes.flatMap((route) => {
      const routeOffenders =
        isSeamPath(route.path) && !route.isUndocumented
          ? [`route ${route.path}`]
          : []
      const endpointOffenders = route.endpoints.flatMap((endpoint) =>
        isSeamPath(endpoint.path) && !endpoint.isUndocumented
          ? [`endpoint ${endpoint.path}`]
          : [],
      )

      return [...routeOffenders, ...endpointOffenders]
    }),
    ...namespaces.flatMap((namespace) =>
      isSeamPath(namespace.path) && !namespace.isUndocumented
        ? [`namespace ${namespace.path}`]
        : [],
    ),
    ...resources.flatMap((resource) =>
      isSeamPath(resource.routePath) && !resource.isUndocumented
        ? [`resource ${resource.routePath}`]
        : [],
    ),
    ...events.flatMap((event) =>
      isSeamPath(event.routePath) && !event.isUndocumented
        ? [`event ${event.routePath}`]
        : [],
    ),
    ...actionAttempts.flatMap((actionAttempt) =>
      isSeamPath(actionAttempt.routePath) && !actionAttempt.isUndocumented
        ? [`action_attempt ${actionAttempt.routePath}`]
        : [],
    ),
  ]

  if (offenders.length > 0) {
    throw new Error(
      `All /seam entries must be marked undocumented. Found: ${offenders.join(', ')}`,
    )
  }
}

export const assertDocumentedEndpointsDontReferenceUndocumentedResources = ({
  routes,
  resources,
}: Pick<Blueprint, 'routes' | 'resources'>): void => {
  const undocumentedResourceTypes = new Set(
    resources.filter((r) => r.isUndocumented).map((r) => r.resourceType),
  )

  const offenders: string[] = []

  for (const route of routes) {
    for (const endpoint of route.endpoints) {
      if (endpoint.isUndocumented) continue
      if (endpoint.response.responseType === 'void') continue
      if (!('resourceType' in endpoint.response)) continue

      const { resourceType } = endpoint.response
      if (undocumentedResourceTypes.has(resourceType)) {
        offenders.push(
          `${endpoint.path} references undocumented resource '${resourceType}'`,
        )
      }
    }
  }

  if (offenders.length > 0) {
    throw new Error(
      `Documented endpoints must not reference undocumented resources. Found:\n${offenders.join('\n')}`,
    )
  }
}

export const assertDocumentedResourcesDontReferenceUndocumentedRoutes = ({
  routes,
  resources,
  events,
  actionAttempts,
}: Pick<
  Blueprint,
  'routes' | 'resources' | 'events' | 'actionAttempts'
>): void => {
  const undocumentedRoutePaths = new Set(
    routes.filter((route) => route.isUndocumented).map((route) => route.path),
  )

  const offenders = [
    ...resources.flatMap((resource) =>
      !resource.isUndocumented && undocumentedRoutePaths.has(resource.routePath)
        ? [
            `resource '${resource.resourceType}' references undocumented route '${resource.routePath}'`,
          ]
        : [],
    ),
    ...events.flatMap((event) =>
      !event.isUndocumented && undocumentedRoutePaths.has(event.routePath)
        ? [
            `event '${event.eventType}' references undocumented route '${event.routePath}'`,
          ]
        : [],
    ),
    ...actionAttempts.flatMap((actionAttempt) =>
      !actionAttempt.isUndocumented &&
      undocumentedRoutePaths.has(actionAttempt.routePath)
        ? [
            `action_attempt '${actionAttempt.actionAttemptType}' references undocumented route '${actionAttempt.routePath}'`,
          ]
        : [],
    ),
  ]

  if (offenders.length > 0) {
    throw new Error(
      `Documented resources must not reference undocumented routes. Found:\n${offenders.join('\n')}`,
    )
  }
}
