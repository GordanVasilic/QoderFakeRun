import type { 
  FileGenerationRequest, 
  RouteCreationRequest, 
  RouteSearch, 
  ElevationRequest,
  ApiSuccess,
  ApiError 
} from '@/lib/validations'

class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://yourdomain.com' 
      : 'http://localhost:3000'  // Fixed: Use port 3000 for development
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiSuccess<T> | ApiError> {
    try {
      const url = `${this.baseUrl}/api${endpoint}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
          code: data.code,
          details: data.details
        }
      }

      return data
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR'
      }
    }
  }

  // File generation API
  async generateFiles(request: FileGenerationRequest) {
    return this.request<{
      files: Array<{
        name: string
        content: string
        mimeType: string
      }>
      metadata: {
        routePoints: number
        distance: number
        format: string
        generatedAt: string
      }
    }>('/files/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Elevation API
  async getElevationData(request: ElevationRequest) {
    return this.request<{
      points: Array<{
        lat: number
        lng: number
        elevation: number
        index: number
      }>
      statistics: {
        minElevation: number
        maxElevation: number
        totalGain: number
        averageElevation: number
      }
      metadata: {
        pointCount: number
        source: string
        generatedAt: string
      }
    }>('/elevation', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Route management API
  async createRoute(request: RouteCreationRequest) {
    return this.request<{
      id: string
      name: string
      createdAt: string
      stats: {
        distance: number
        duration: number
        elevationGain: number
        pointCount: number
      }
    }>('/routes', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async searchRoutes(params: RouteSearch) {
    const queryParams = new URLSearchParams()
    
    if (params.query) queryParams.set('query', params.query)
    if (params.tags) queryParams.set('tags', params.tags.join(','))
    if (params.minDistance !== undefined) queryParams.set('minDistance', params.minDistance.toString())
    if (params.maxDistance !== undefined) queryParams.set('maxDistance', params.maxDistance.toString())
    if (params.activityType) queryParams.set('activityType', params.activityType)
    queryParams.set('page', params.page.toString())
    queryParams.set('limit', params.limit.toString())

    return this.request<{
      routes: Array<{
        id: string
        name: string
        description: string
        tags: string[]
        stats: {
          distance: number
          duration: number
          elevationGain: number
          pointCount: number
        }
        createdAt: string
      }>
      pagination: {
        page: number
        limit: number
        total: number
        pages: number
      }
      filters: RouteSearch
    }>(`/routes?${queryParams.toString()}`)
  }

  // Rate limit info
  async getRateLimitInfo() {
    return this.request<{
      ip: string
      limits: {
        fileGeneration: string
        maxRoutePoints: number
        maxDistance: string
      }
    }>('/files/generate')
  }

  // Health check
  async healthCheck() {
    return this.request<{
      status: string
      timestamp: string
      version: string
    }>('/health')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export individual methods for convenience
export const {
  generateFiles,
  getElevationData,
  createRoute,
  searchRoutes,
  getRateLimitInfo,
  healthCheck
} = apiClient

// Utility function for handling API responses
export function handleApiResponse<T>(
  response: ApiSuccess<T> | ApiError,
  onSuccess: (data: T) => void,
  onError?: (error: ApiError) => void
) {
  if (response.success) {
    onSuccess(response.data)
  } else {
    if (onError) {
      onError(response)
    } else {
      console.error('API Error:', response.error)
      // Default error handling
      if (response.code === 'RATE_LIMIT_EXCEEDED') {
        alert('Too many requests. Please wait a moment and try again.')
      } else if (response.code === 'VALIDATION_ERROR') {
        alert('Invalid data provided. Please check your input.')
      } else {
        alert(response.error || 'An error occurred. Please try again.')
      }
    }
  }
}

// Export types for use in components
export type { ApiSuccess, ApiError }