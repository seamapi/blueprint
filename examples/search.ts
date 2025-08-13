import { writeFile } from 'node:fs/promises'
import { join } from 'path'

import { createBlueprint, TypesModuleSchema } from '@seamapi/blueprint'
import type { Builder, Command, Describe, Handler } from 'landlubber'

interface Options {
  moduleName: string
  query: string
  output?: string
}

export const command: Command = 'search [query]'

export const describe: Describe = 'Search for properties and parameters in a blueprint'

export const builder: Builder = {
  query: {
    type: 'string',
    demandOption: true,
    describe: 'Search query to find matching properties and parameters',
  },
  moduleName: {
    type: 'string',
    default: '@seamapi/types/connect',
    describe: 'Module name or path to import',
  },
  output: {
    type: 'string',
    describe: 'Output file path for search results (optional)',
  },
}


export const handler: Handler<Options> = async ({ moduleName, query, output, logger }) => {
  const types = TypesModuleSchema.parse(await import(moduleName))
  const blueprint = await createBlueprint(types)
  
  // Normalize query once at the start
  const normalizedQuery = query.toLowerCase().trim()
  
  logger.info({ query: normalizedQuery, moduleName }, 'Searching blueprint')
  
  // Perform search across all blueprint components
  const searchResults = [
    ...searchRoutes(blueprint.routes, normalizedQuery),
    ...searchResources(blueprint.resources, normalizedQuery),
  ]
  
  // Remove duplicates based on path and name
  const uniqueResults = searchResults.filter((result, index, self) => 
    index === self.findIndex(r => r.path === result.path && r.name === result.name)
  )
  
  // Sort results by relevance (exact matches first, then by type)
  uniqueResults.sort((a, b) => {
    // Exact matches first
    const aExact = a.name.toLowerCase() === normalizedQuery
    const bExact = b.name.toLowerCase() === normalizedQuery
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    
    // Then by type priority: route > endpoint > resource > parameter > property
    const typePriority = { route: 0, endpoint: 1, resource: 2, parameter: 3, property: 4 }
    const aPriority = typePriority[a.type as keyof typeof typePriority] ?? 5
    const bPriority = typePriority[b.type as keyof typeof typePriority] ?? 5
    
    if (aPriority !== bPriority) return aPriority - bPriority
    
    // Finally by path length (shorter paths first)
    return a.path.length - b.path.length
  })
  
  logger.info({ resultCount: uniqueResults.length }, 'Search completed')
  
  // Display results
  if (uniqueResults.length === 0) {
    logger.info('No results found')
    return
  }
  
  logger.info(`Found ${uniqueResults.length} results for "${query}":`)
  
  for (const result of uniqueResults) {
    let displayPath = result.path
    
    // Format paths based on type for better readability
    if (result.type === 'route') {
      displayPath = result.path
    } else if (result.type === 'endpoint') {
      displayPath = result.path
    } else if (result.type === 'resource') {
      displayPath = result.path
    } else if (result.type === 'parameter') {
      // For parameters, show endpoint path with parameter
      displayPath = `${result.path}?${result.name}`
    } else if (result.type === 'property') {
      // For properties, show resource path with property
      displayPath = `${result.path}.${result.name}`
    }
    
    const required = result.isRequired ? ' [required]' : ''
    const methods = result.methods ? ` [${result.methods.join(', ')}]` : ''
    
    logger.info(`${result.type.toUpperCase()}: ${result.name}${required}${methods} - ${displayPath}`)
  }
  
  // Save results to file if output is specified
  if (output) {
    const outputPath = join('/tmp', output)
    const outputData = {
      query: normalizedQuery,
      moduleName,
      resultCount: uniqueResults.length,
      results: uniqueResults,
      timestamp: new Date().toISOString(),
    }
    
    await writeFile(outputPath, JSON.stringify(outputData, null, 2))
    logger.info({ outputPath }, 'Search results saved to file')
  }
}


// Simple fuzzy search implementation
function fuzzySearch(query: string, text: string): boolean {
  const textLower = text.toLowerCase()
  
  let queryIndex = 0
  let textIndex = 0
  
  while (queryIndex < query.length && textIndex < textLower.length) {
    if (query[queryIndex] === textLower[textIndex]) {
      queryIndex++
    }
    textIndex++
  }
  
  return queryIndex === query.length
}
  
  // Search through properties recursively
  function searchProperties(properties: any[], query: string, path: string = ''): any[] {
    const results: any[] = []
    
    for (const prop of properties) {
      const currentPath = path ? `${path}.${prop.name}` : prop.name
      
      // Check if property name matches
      if (fuzzySearch(query, prop.name)) {
        results.push({
          type: 'property',
          path: currentPath,
          name: prop.name,
          description: prop.description,
          format: prop.format,
          jsonType: prop.jsonType,
          location: 'resource',
        })
      }
      
      // Recursively search nested properties
      if (prop.properties && Array.isArray(prop.properties)) {
        results.push(...searchProperties(prop.properties, query, currentPath))
      }
      
      // Search through item properties for list types
      if (prop.itemProperties && Array.isArray(prop.itemProperties)) {
        results.push(...searchProperties(prop.itemProperties, query, `${currentPath}[item]`))
      }
    }
    
    return results
  }
  
  // Search through parameters recursively
  function searchParameters(parameters: any[], query: string, path: string = ''): any[] {
    const results: any[] = []
    
    for (const param of parameters) {
      const currentPath = path ? `${path}.${param.name}` : param.name
      
      // Check if parameter name matches
      if (fuzzySearch(query, param.name)) {
        results.push({
          type: 'parameter',
          path: currentPath,
          name: param.name,
          description: param.description,
          format: param.format,
          jsonType: param.jsonType,
          isRequired: param.isRequired,
          location: 'request',
        })
      }
      
      // Recursively search nested parameters
      if (param.parameters && Array.isArray(param.parameters)) {
        results.push(...searchParameters(param.parameters, query, currentPath))
      }
      
      // Search through item parameters for list types
      if (param.itemParameters && Array.isArray(param.itemParameters)) {
        results.push(...searchParameters(param.itemParameters, query, `${currentPath}[item]`))
      }
    }
    
    return results
  }
  
  // Search through routes and endpoints
  function searchRoutes(routes: any[], query: string): any[] {
    const results: any[] = []
    
    for (const route of routes) {
      // Check route path
      if (fuzzySearch(query, route.path)) {
        results.push({
          type: 'route',
          path: route.path,
          name: route.name,
          description: `Route: ${route.path}`,
          location: 'route',
        })
      }
      
      // Check route name
      if (fuzzySearch(query, route.name)) {
        results.push({
          type: 'route',
          path: route.path,
          name: route.name,
          description: `Route: ${route.path}`,
          location: 'route',
        })
      }
      
      // Search through endpoints
      for (const endpoint of route.endpoints) {
        // Check endpoint title
        if (fuzzySearch(query, endpoint.title)) {
          results.push({
            type: 'endpoint',
            path: endpoint.path,
            name: endpoint.title,
            description: endpoint.description,
            methods: endpoint.request.methods,
            location: 'endpoint',
          })
        }
        
        // Search through request parameters
        if (endpoint.request.parameters) {
          results.push(...searchParameters(endpoint.request.parameters, query, `endpoint:${endpoint.path}`))
        }
      }
    }
    
    return results
  }

// Search through resources
function searchResources(resources: any[], query: string): any[] {
  const results: any[] = []
  
  for (const resource of resources) {
    // Check resource type
    if (fuzzySearch(query, resource.resourceType)) {
      results.push({
        type: 'resource',
        path: resource.routePath,
        name: resource.resourceType,
        description: resource.description,
        location: 'resource',
      })
    }
    
    // Search through properties
    if (resource.properties) {
      results.push(...searchProperties(resource.properties, query, `resource:${resource.resourceType}`))
    }
  }
  
  return results
}