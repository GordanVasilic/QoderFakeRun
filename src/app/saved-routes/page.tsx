'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSavedRoutesStore } from '@/store/savedRoutesStore'
import { useAuthStore } from '@/store/authStore'
import SavedRouteCard from '@/components/SavedRouteCard'
import type { SavedRoute } from '@/store/savedRoutesStore'

export default function SavedRoutesPage() {
  const router = useRouter()
  const { isAuthenticated, checkAuth } = useAuthStore()
  const {
    routes,
    viewMode,
    isLoading,
    error,
    filters,
    pagination,
    fetchRoutes,
    setViewMode,
    setFilters,
    clearError
  } = useSavedRoutesStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [localFilters, setLocalFilters] = useState({
    activityType: '',
    minDistance: '',
    maxDistance: '',
    minPace: '',
    maxPace: '',
    minElevationGain: '',
    maxElevationGain: '',
    minHeartRate: '',
    maxHeartRate: '',
    difficulty: '',
    startDate: '',
    endDate: ''
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    // Load from localStorage or default to false
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('savedRoutes_showAdvancedFilters')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })

  // Check authentication and load routes
  useEffect(() => {
    const initializePage = async () => {
      const isAuth = await checkAuth()
      if (!isAuth) {
        router.push('/login?redirect=/saved-routes')
        return
      }
      
      // Only fetch routes if authenticated and not already initialized
      if (!isInitialized && isAuth) {
        fetchRoutes()
        setIsInitialized(true)
      }
    }
    
    initializePage()
  }, [checkAuth, router, fetchRoutes, isInitialized])

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== filters.query) {
        setFilters({ query: searchQuery || undefined })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, filters.query, setFilters])

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }))
    
    const filterValue = value === '' ? undefined : 
      key.includes('Distance') ? Number(value) : value as any

    setFilters({ [key]: filterValue })
  }

  // Handle advanced filters toggle
  const toggleAdvancedFilters = () => {
    const newState = !showAdvancedFilters
    setShowAdvancedFilters(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedRoutes_showAdvancedFilters', JSON.stringify(newState))
    }
  }

  // Handle load more for infinite scroll
  const handleLoadMore = () => {
    if (!isLoading && pagination.hasMore) {
      fetchRoutes(true)
    }
  }

  // Handle route load - fetch full route data and navigate to main page
  const handleLoadRoute = async (route: SavedRoute) => {
    // Check if routeData is missing (which it will be from the list API)
    if (!route.routeData) {
      try {
        console.log('📡 SavedRoutes: Fetching full route data for:', route.id);
        
        // Get current auth state and token
        const { token } = useAuthStore.getState();
        console.log('🔑 SavedRoutes: Using token for request:', !!token);
        
        // Fetch the full route data from the individual route endpoint with auth
        const response = await fetch(`/api/routes/${route.id}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📊 SavedRoutes: Route fetch response status:', response.status);
        const result = await response.json();
        console.log('📄 SavedRoutes: Route fetch result:', result.success ? 'SUCCESS' : 'FAILED', result.error || '');
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch full route data')
        }
        
        const fullRoute = result.data
        
        console.log('📍 SavedRoutes: Full route data fetched from API:', {
          hasRouteData: !!fullRoute.routeData,
          routeDataKeys: fullRoute.routeData ? Object.keys(fullRoute.routeData) : [],
          hasPaceHeartRateSettings: !!fullRoute.routeData?.paceHeartRateSettings,
          paceHeartRateSettings: fullRoute.routeData?.paceHeartRateSettings,
          chartDataLength: fullRoute.chartData?.length || 0,
          hasHeartRateInChart: fullRoute.chartData?.some((d: any) => d.heartRate && d.heartRate > 0) || false
        })
        
        // Verify we now have the full route data
        if (!fullRoute.routeData) {
          throw new Error('Individual route API also missing routeData')
        }
        
        // Store the FULL route data in sessionStorage
        const dataToStore = {
          routeData: {
            ...fullRoute.routeData,
            // Ensure routeCoordinates is available for preview map
            routeCoordinates: fullRoute.routeData.routeCoordinates || fullRoute.routeData.routeGeometry?.coordinates || []
          },
          chartData: fullRoute.chartData || [],
          activityType: fullRoute.activityType,
          routeName: fullRoute.name,
          description: fullRoute.description || '',
          date: fullRoute.date || new Date().toISOString().split('T')[0],
          startTime: fullRoute.startTime || '12:00',
          paceHeartRateSettings: fullRoute.routeData?.paceHeartRateSettings ? {
            // Use the actual saved settings
            averagePace: fullRoute.routeData.paceHeartRateSettings.averagePace,
            paceInconsistency: fullRoute.routeData.paceHeartRateSettings.paceInconsistency,
            includeHeartRate: fullRoute.routeData.paceHeartRateSettings.includeHeartRate,
            averageHeartRate: fullRoute.routeData.paceHeartRateSettings.averageHeartRate,
            heartRateVariability: fullRoute.routeData.paceHeartRateSettings.heartRateVariability
          } : {
            // Use reasonable defaults only if no saved settings exist
            averagePace: 5.5, // Default running pace
            paceInconsistency: 30,
            includeHeartRate: fullRoute.chartData?.some((d: any) => d.heartRate && d.heartRate > 0) || false,
            averageHeartRate: 150,
            heartRateVariability: 20
          }
        }
        
        console.log('💾 SavedRoutes: Storing FULL route data with HR settings:', {
          hasRouteData: !!dataToStore.routeData,
          chartDataLength: dataToStore.chartData.length,
          hasHeartRateInChart: dataToStore.chartData.some((d: any) => d.heartRate && d.heartRate > 0),
          paceHeartRateSettings: dataToStore.paceHeartRateSettings,
          routeId: route.id
        })
        
        // Store data in sessionStorage
        console.log('🔥 SavedRoutes: About to store data in sessionStorage:', {
          dataToStoreKeys: Object.keys(dataToStore),
          hasRouteData: !!dataToStore.routeData,
          chartDataLength: dataToStore.chartData?.length || 0,
          paceHeartRateSettings: dataToStore.paceHeartRateSettings,
          stringifiedLength: JSON.stringify(dataToStore).length
        })
        
        sessionStorage.setItem('loadRouteData', JSON.stringify(dataToStore))
        
        // Verify the data was stored correctly
        const verifyStored = sessionStorage.getItem('loadRouteData')
        console.log('✅ SavedRoutes: Verification - data stored successfully:', {
          wasStored: !!verifyStored,
          storedLength: verifyStored?.length || 0,
          canParse: (() => {
            try {
              const parsed = JSON.parse(verifyStored || '{}')
              return {
                success: true,
                hasRouteData: !!parsed.routeData,
                chartDataLength: parsed.chartData?.length || 0
              }
            } catch (e) {
              return { success: false, error: e.message }
            }
          })()
        })
        
        // Use requestAnimationFrame to ensure sessionStorage is written before navigation
        requestAnimationFrame(() => {
          console.log('🚀 SavedRoutes: Navigating to home page...')
          router.push('/')
        })
        
      } catch (error) {
        console.error('Failed to fetch full route data:', error)
        
        // Fallback: store whatever data we have from the preview
        const fallbackData = {
          routeData: {
            ...(route.routeData as Record<string, any> || {}),
            // Try to extract coordinates and elevations from routeGeometry if available
            routeCoordinates: (route.routeData as any)?.routeCoordinates || (route.routeData as any)?.routeGeometry?.coordinates || [],
            routeElevations: (route.routeData as any)?.routeElevations || [],
            // Include stats properties from the route stats object
            distance: route.stats?.distance || 0,
            duration: route.stats?.duration || 0,
            elevationGain: route.stats?.elevationGain || 0,
            averagePace: route.stats?.averagePace || 5.5
          },  
          chartData: route.chartData || [],
          activityType: route.activityType,
          routeName: route.name,
          description: route.description || '',
          date: route.date || new Date().toISOString().split('T')[0],
          startTime: route.startTime || '12:00',
          previewData: (route as any).previewData  // Store preview data as backup
        }
        
        // Store fallback data in sessionStorage
        console.log('🔥 SavedRoutes: About to store FALLBACK data in sessionStorage:', {
          fallbackDataKeys: Object.keys(fallbackData),
          hasRouteData: !!fallbackData.routeData,
          chartDataLength: fallbackData.chartData?.length || 0,
          stringifiedLength: JSON.stringify(fallbackData).length
        })
        
        sessionStorage.setItem('loadRouteData', JSON.stringify(fallbackData))
        
        // Verify the fallback data was stored correctly
        const verifyStored = sessionStorage.getItem('loadRouteData')
        console.log('✅ SavedRoutes: Verification - FALLBACK data stored successfully:', {
          wasStored: !!verifyStored,
          storedLength: verifyStored?.length || 0,
          canParse: (() => {
            try {
              const parsed = JSON.parse(verifyStored || '{}')
              return {
                success: true,
                hasRouteData: !!parsed.routeData,
                chartDataLength: parsed.chartData?.length || 0
              }
            } catch (e) {
              return { success: false, error: e.message }
            }
          })()
        })
        
        // Use requestAnimationFrame to ensure sessionStorage is written before navigation
        requestAnimationFrame(() => {
          console.log('🚀 SavedRoutes: Navigating to home page (fallback)...')
          router.push('/')
        })
      }
    } else {
      try {
        // Store the route data in sessionStorage for the main page to pick up
        const dataToStore = {
          routeData: {
            ...(route.routeData as Record<string, any> || {}),
            // Ensure all stats properties are included from both routeData and stats objects
            distance: route.routeData?.distance || route.stats?.distance || 0,
            duration: route.routeData?.duration || route.stats?.duration || 0,
            elevationGain: route.routeData?.elevationGain || route.stats?.elevationGain || 0,
            averagePace: route.routeData?.averagePace || route.stats?.averagePace || 5.5,
            // Ensure routeCoordinates and routeElevations are available for preview map
            routeCoordinates: (route.routeData as any)?.routeCoordinates || (route.routeData as any)?.routeGeometry?.coordinates || [],
            routeElevations: (route.routeData as any)?.routeElevations || []
          },
          chartData: route.chartData || [],
          activityType: route.activityType,
          routeName: route.name,
          description: route.description || '',
          date: route.date || new Date().toISOString().split('T')[0],
          startTime: route.startTime || '12:00',
          paceHeartRateSettings: route.paceHeartRateSettings ? {
            // Use the actual saved settings
            averagePace: route.paceHeartRateSettings.averagePace,
            paceInconsistency: route.paceHeartRateSettings.paceInconsistency,
            includeHeartRate: route.paceHeartRateSettings.includeHeartRate,
            averageHeartRate: route.paceHeartRateSettings.averageHeartRate,
            heartRateVariability: route.paceHeartRateSettings.heartRateVariability
          } : {
            // Use reasonable defaults only if no saved settings exist
            averagePace: 5.5, // Default running pace
            paceInconsistency: 30,
            includeHeartRate: route.chartData?.some((d: any) => d.heartRate && d.heartRate > 0) || false,
            averageHeartRate: 150,
            heartRateVariability: 20
          }
        }
        
        console.log('💾 SavedRoutes: Storing route data with HR settings:', {
          routeName: route.name,
          hasStoredPaceSettings: !!route.paceHeartRateSettings,
          storedPaceSettings: route.paceHeartRateSettings,
          chartDataLength: dataToStore.chartData.length,
          hasHeartRateInChart: dataToStore.chartData.some((d: any) => d.heartRate && d.heartRate > 0),
          finalPaceHeartRateSettings: dataToStore.paceHeartRateSettings,
          fullRouteObject: route,
          dataToStoreKeys: Object.keys(dataToStore),
          timestamp: new Date().toISOString()
        })
        
        console.log('🔍 SavedRoutes: Detailed paceHeartRateSettings analysis:', {
          originalFromDB: route.paceHeartRateSettings,
          processedForStorage: dataToStore.paceHeartRateSettings,
          areEqual: JSON.stringify(route.paceHeartRateSettings) === JSON.stringify(dataToStore.paceHeartRateSettings),
          originalType: typeof route.paceHeartRateSettings,
          processedType: typeof dataToStore.paceHeartRateSettings
        })
        
        // Store data in sessionStorage
        sessionStorage.setItem('loadRouteData', JSON.stringify(dataToStore))
        
        // Use requestAnimationFrame to ensure sessionStorage is written before navigation
        requestAnimationFrame(() => {
          router.push('/')
        })
      } catch (error) {
        console.error('Error loading route:', error)
        // Fallback navigation without data
        router.push('/')
      }
    }
  }

  // Handle sort change
  const handleSortChange = (sortBy: string, sortOrder: string) => {
    setFilters({ 
      sortBy: sortBy as 'createdAt' | 'name' | 'distance' | 'averagePace' | 'elevationGain' | 'difficulty',
      sortOrder: sortOrder as 'asc' | 'desc'
    })
  }

  // Show loading while checking authentication or initializing
  if (!isAuthenticated || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{!isAuthenticated ? 'Checking authentication...' : 'Loading routes...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Saved Routes
              </h1>
              <span className="text-sm text-gray-500">
                {pagination.total} route{pagination.total !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search routes by name, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Basic Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Activity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
              <select
                value={localFilters.activityType}
                onChange={(e) => handleFilterChange('activityType', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="run">🏃 Running</option>
                <option value="bike">🚴 Biking</option>
              </select>
            </div>

            {/* Distance Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Distance (km)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={localFilters.minDistance}
                onChange={(e) => handleFilterChange('minDistance', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Distance (km)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="∞"
                value={localFilters.maxDistance}
                onChange={(e) => handleFilterChange('maxDistance', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-')
                  handleSortChange(sortBy, sortOrder)
                }}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="createdAt-desc">Newest first</option>
                <option value="createdAt-asc">Oldest first</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="distance-desc">Longest first</option>
                <option value="distance-asc">Shortest first</option>
                <option value="averagePace-asc">Fastest pace</option>
                <option value="averagePace-desc">Slowest pace</option>
                <option value="elevationGain-desc">Most elevation</option>
                <option value="elevationGain-asc">Least elevation</option>
                <option value="difficulty-asc">Easiest first</option>
                <option value="difficulty-desc">Hardest first</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="ml-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="mt-4">
            <button
              onClick={toggleAdvancedFilters}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${
                  showAdvancedFilters ? 'rotate-90' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            </button>
          </div>

          {/* Advanced Filters Section */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showAdvancedFilters ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}>
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">

              {/* Pace Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Pace (min/km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={localFilters.minPace}
                  onChange={(e) => handleFilterChange('minPace', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Pace (min/km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="∞"
                  value={localFilters.maxPace}
                  onChange={(e) => handleFilterChange('maxPace', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Elevation Gain Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Elevation (m)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={localFilters.minElevationGain}
                  onChange={(e) => handleFilterChange('minElevationGain', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Elevation (m)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="∞"
                  value={localFilters.maxElevationGain}
                  onChange={(e) => handleFilterChange('maxElevationGain', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Heart Rate Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Heart Rate (bpm)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={localFilters.minHeartRate}
                  onChange={(e) => handleFilterChange('minHeartRate', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Heart Rate (bpm)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="∞"
                  value={localFilters.maxHeartRate}
                  onChange={(e) => handleFilterChange('maxHeartRate', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={localFilters.difficulty}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  <option value="easy">🟢 Easy</option>
                  <option value="moderate">🟡 Moderate</option>
                  <option value="hard">🔴 Hard</option>
                </select>
              </div>

              {/* Date Range Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={localFilters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={localFilters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || Object.values(localFilters).some(value => value !== '')) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setSearchQuery('')
                  setLocalFilters({
                    activityType: '',
                    minDistance: '',
                    maxDistance: '',
                    minPace: '',
                    maxPace: '',
                    minElevationGain: '',
                    maxElevationGain: '',
                    minHeartRate: '',
                    maxHeartRate: '',
                    difficulty: '',
                    startDate: '',
                    endDate: ''
                  })
                  setFilters({
                    query: undefined,
                    activityType: undefined,
                    minDistance: undefined,
                    maxDistance: undefined,
                    minPace: undefined,
                    maxPace: undefined,
                    minElevationGain: undefined,
                    maxElevationGain: undefined,
                    minHeartRate: undefined,
                    maxHeartRate: undefined,
                    difficulty: undefined,
                    startDate: undefined,
                    endDate: undefined
                  })
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-red-600">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Routes Grid/List */}
        {routes.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved routes</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || Object.values(localFilters).some(v => v) 
                ? "No routes match your search criteria." 
                : "Start by creating and saving your first route."
              }
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Route
            </button>
          </div>
        ) : (
          <>
            {/* Routes Display */}
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }>
              {routes.map((route) => (
                <SavedRouteCard
                  key={route.id}
                  route={route}
                  viewMode={viewMode}
                  onLoad={handleLoadRoute}
                />
              ))}
            </div>

            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Loading...' : 'Load More Routes'}
                </button>
              </div>
            )}

            {/* Loading indicator for initial load */}
            {isLoading && routes.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading routes...
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}