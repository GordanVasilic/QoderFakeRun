import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { RouteData, ChartDataPoint, PaceHeartRateSettings } from '@/types'

// Types for saved routes
export interface SavedRoute {
  id: string
  name: string
  description?: string
  date?: string // Added date field
  startTime?: string // Added startTime field
  routeData: RouteData
  chartData?: ChartDataPoint[]
  activityType: 'run' | 'bike'
  tags?: string[]
  stats: {
    distance: number
    duration: number
    elevationGain: number
    pointCount: number
    averagePace: number
    averageHeartRate?: number
    difficulty?: string
  }
  createdAt: string
  updatedAt: string
  previewData?: {
    points: Array<{ lat: number; lng: number }>
    routeCoordinates: Array<[number, number]>
  }
  paceHeartRateSettings?: PaceHeartRateSettings
}

export interface SavedRoutesFilters {
  query?: string
  activityType?: 'run' | 'bike'
  minDistance?: number
  maxDistance?: number
  minPace?: number
  maxPace?: number
  minElevationGain?: number
  maxElevationGain?: number
  minHeartRate?: number
  maxHeartRate?: number
  difficulty?: string
  startDate?: string
  endDate?: string
  tags?: string[]
  sortBy: 'createdAt' | 'name' | 'distance' | 'elevationGain' | 'averagePace' | 'difficulty'
  sortOrder: 'asc' | 'desc'
}

export interface SavedRoutesPagination {
  page: number
  limit: number
  total: number
  pages: number
  hasMore: boolean
}

export interface SavedRoutesState {
  // Data
  routes: SavedRoute[]
  currentRoute: SavedRoute | null
  
  // UI State
  viewMode: 'list' | 'grid'
  isLoading: boolean
  error: string | null
  
  // Search & Filters
  filters: SavedRoutesFilters
  pagination: SavedRoutesPagination
  
  // Actions
  fetchRoutes: (loadMore?: boolean) => Promise<void>
  validateRouteName: (name: string) => Promise<boolean>
  overwriteRoute: (routeData: RouteData, chartData?: ChartDataPoint[], activityType?: 'run' | 'bike', name?: string, description?: string, date?: string, startTime?: string, paceHeartRateSettings?: PaceHeartRateSettings) => Promise<SavedRoute | null>
  saveRoute: (routeData: RouteData, chartData?: ChartDataPoint[], activityType?: 'run' | 'bike', name?: string, description?: string, date?: string, startTime?: string, paceHeartRateSettings?: PaceHeartRateSettings) => Promise<SavedRoute | null>
  loadRoute: (id: string) => Promise<SavedRoute | null>
  deleteRoute: (id: string) => Promise<boolean>
  downloadRoute: (id: string, format: 'gpx') => Promise<boolean>
  
  // UI Actions
  setViewMode: (mode: 'list' | 'grid') => void
  setFilters: (filters: Partial<SavedRoutesFilters>) => void
  setCurrentRoute: (route: SavedRoute | null) => void
  clearError: () => void
  resetPagination: () => void
}

const initialFilters: SavedRoutesFilters = {
  sortBy: 'createdAt',
  sortOrder: 'desc'
}

const initialPagination: SavedRoutesPagination = {
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
  hasMore: false
}

export const useSavedRoutesStore = create<SavedRoutesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      routes: [],
      currentRoute: null,
      viewMode: 'grid',
      isLoading: false,
      error: null,
      filters: initialFilters,
      pagination: initialPagination,

      // Fetch routes with search and pagination
      fetchRoutes: async (loadMore = false) => {
        const { filters, pagination } = get()
        
        set({ isLoading: true, error: null })
        
        try {
          const params = new URLSearchParams()
          
          // Add filters to params
          if (filters.query) params.append('query', filters.query)
          if (filters.activityType) params.append('activityType', filters.activityType)
          if (filters.minDistance !== undefined) params.append('minDistance', filters.minDistance.toString())
          if (filters.maxDistance !== undefined) params.append('maxDistance', filters.maxDistance.toString())
          if (filters.tags?.length) params.append('tags', filters.tags.join(','))
          
          params.append('sortBy', filters.sortBy)
          params.append('sortOrder', filters.sortOrder)
          params.append('page', (loadMore ? pagination.page + 1 : 1).toString())
          params.append('limit', pagination.limit.toString())

          // Get authentication token from auth store
          const { useAuthStore } = await import('./authStore');
          const { token } = useAuthStore.getState();
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`/api/routes?${params.toString()}`, {
            headers
          })
          const result = await response.json()

          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch routes')
          }

          const newRoutes = result.data.routes as SavedRoute[]
          const newPagination = result.data.pagination

          set({
            routes: loadMore ? [...get().routes, ...newRoutes] : newRoutes,
            pagination: newPagination,
            isLoading: false
          })

        } catch (error) {
          console.error('Failed to fetch routes:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch routes',
            isLoading: false 
          })
        }
      },

      // Validate route name
      validateRouteName: async (name: string) => {
        console.log('🔍 ValidateRouteName called with name:', name)
        try {
          // Get authentication token from auth store
          const { useAuthStore } = await import('./authStore');
          const { token } = useAuthStore.getState();
          
          console.log('🔍 ValidateRouteName token exists:', !!token)
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          console.log('🔍 ValidateRouteName making API call to /api/routes/validate-name')
          const response = await fetch('/api/routes/validate-name', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: name.trim() })
          })

          console.log('🔍 ValidateRouteName response status:', response.status)
          const result = await response.json()
          console.log('🔍 ValidateRouteName result:', result)

          if (!result.success) {
            throw new Error(result.error || 'Failed to validate route name')
          }

          console.log('🔍 ValidateRouteName returning exists:', result.data.exists)
          console.log('🔍 ValidateRouteName exists type:', typeof result.data.exists)
          const booleanResult = Boolean(result.data.exists)
          console.log('🔍 ValidateRouteName boolean conversion:', booleanResult)
          return booleanResult

        } catch (error) {
          console.error('Failed to validate route name:', error)
          throw error
        }
      },

      // Overwrite existing route
      overwriteRoute: async (routeData, chartData, activityType, name, description, date, startTime, paceHeartRateSettings) => {
        try {
          // Get authentication token from auth store
          const { useAuthStore } = await import('./authStore');
          const { token } = useAuthStore.getState();
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/api/routes/overwrite', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              routeData,
              chartData,
              activityType,
              name,
              description,
              date,
              startTime,
              paceHeartRateSettings
            })
          })

          const result = await response.json()

          if (!result.success) {
            throw new Error(result.error || 'Failed to overwrite route')
          }

          // Refresh the routes list
          await get().fetchRoutes()
          
          return result.data

        } catch (error) {
          console.error('Failed to overwrite route:', error)
          throw error
        }
      },

      // Save a new route
      saveRoute: async (
        routeData: RouteData, 
        chartData?: ChartDataPoint[], 
        activityType?: 'run' | 'bike', 
        name?: string, 
        description?: string, 
        date?: string, 
        startTime?: string, 
        paceHeartRateSettings?: PaceHeartRateSettings
      ) => {
        console.log('🏪 SavedRoutesStore: saveRoute called with:', {
          routeDataKeys: Object.keys(routeData),
          chartDataLength: chartData?.length || 0,
          activityType,
          name,
          description,
          date,
          startTime,
          paceHeartRateSettings
        })
        
        set({ isLoading: true, error: null })
        
        try {
          const payload = {
            name: name || `My${activityType === 'bike' ? 'Ride' : 'Run'} ${new Date().toLocaleDateString()}`,
            description: description || '',
            routeData: routeData,
            isPublic: false, // Default to private
            chartData: chartData || [],
            activityType: activityType || 'run',
            date: date || new Date().toISOString().split('T')[0], // Default to today
            startTime: startTime || '12:00', // Default to noon
            paceHeartRateSettings: paceHeartRateSettings
          }

          console.log('🏪 SavedRoutesStore: Prepared payload:', {
            payloadKeys: Object.keys(payload),
            paceHeartRateSettings: payload.paceHeartRateSettings,
            routeDataKeys: Object.keys(payload.routeData)
          })

          // Get authentication token from auth store
          const { useAuthStore } = await import('./authStore');
          const { token } = useAuthStore.getState();
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          console.log('🏪 SavedRoutesStore: Making POST request to /api/routes')
          
          const response = await fetch('/api/routes', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          })
          
          console.log('🏪 SavedRoutesStore: Response status:', response.status)

          const result = await response.json()

          if (!result.success) {
            throw new Error(result.error || 'Failed to save route')
          }

          // Refresh routes list
          await get().fetchRoutes()
          
          set({ isLoading: false })
          return result.data

        } catch (error) {
          console.error('Failed to save route:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save route',
            isLoading: false 
          })
          return null
        }
      },

      // Load a specific route
      loadRoute: async (id) => {
        set({ isLoading: true, error: null })
        
        try {
          // Get authentication token from auth store
          const { useAuthStore } = await import('./authStore');
          const { token } = useAuthStore.getState();
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`/api/routes/${id}`, {
            headers
          })
          const result = await response.json()

          if (!result.success) {
            throw new Error(result.error || 'Failed to load route')
          }

          const route = result.data as SavedRoute
          set({ currentRoute: route, isLoading: false })
          return route

        } catch (error) {
          console.error('Failed to load route:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load route',
            isLoading: false 
          })
          return null
        }
      },

      // Delete a route
      deleteRoute: async (id) => {
        set({ isLoading: true, error: null })
        
        try {
          // Get authentication token from auth store
          const { useAuthStore } = await import('./authStore');
          const { token } = useAuthStore.getState();
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`/api/routes/${id}`, {
            method: 'DELETE',
            headers
          })

          const result = await response.json()

          if (!result.success) {
            throw new Error(result.error || 'Failed to delete route')
          }

          // Remove from local state
          set(state => ({
            routes: state.routes.filter(route => route.id !== id),
            isLoading: false
          }))

          return true

        } catch (error) {
          console.error('Failed to delete route:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete route',
            isLoading: false 
          })
          return false
        }
      },

      // Download a route
      downloadRoute: async (id, format) => {
        try {
          const response = await fetch(`/api/routes/${id}/download?format=${format}`)
          
          if (!response.ok) {
            throw new Error('Failed to download route')
          }

          // Create download link
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          
          // Get filename from response headers or generate one
          const contentDisposition = response.headers.get('content-disposition')
          const filename = contentDisposition 
            ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
            : `route_${id}.${format}`
          
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)

          return true

        } catch (error) {
          console.error('Failed to download route:', error)
          set({ error: error instanceof Error ? error.message : 'Failed to download route' })
          return false
        }
      },

      // UI Actions
      setViewMode: (mode) => set({ viewMode: mode }),
      
      setFilters: (newFilters) => {
        set(state => ({ 
          filters: { ...state.filters, ...newFilters },
          pagination: { ...initialPagination } // Reset pagination when filters change
        }))
        // Auto-fetch with new filters
        setTimeout(() => get().fetchRoutes(), 0)
      },
      
      setCurrentRoute: (route) => set({ currentRoute: route }),
      
      clearError: () => set({ error: null }),
      
      resetPagination: () => set({ pagination: initialPagination })
    }),
    {
      name: 'saved-routes-store'
    }
  )
)