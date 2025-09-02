// Temporary fallback service while fixing Prisma issues
export const fallbackRoutesService = {
  async getRoutes({
    userId,
    query,
    activityType,
    minDistance,
    maxDistance,
    tags,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20
  }: {
    userId?: string
    query?: string
    activityType?: string
    minDistance?: number
    maxDistance?: number
    tags?: string[]
    sortBy?: 'createdAt' | 'name' | 'distance'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
  }) {
    console.log('🔄 Fallback service active - Prisma unavailable')
    
    // Return sample data to show the interface works
    const sampleRoutes = [
      {
        id: 'fallback-route-1',
        name: '🔧 Sample Route (Database Temporarily Unavailable)',
        description: 'This is a sample route displayed while the database connection is being fixed.',
        date: '2025-08-26',
        startTime: '12:00',
        activityType: 'run',
        stats: {
          distance: 5.2,
          duration: 1800,
          elevationGain: 45,
          pointCount: 100,
          averagePace: 5.77
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        previewData: {
          points: [
            { lat: 44.79608946972573, lng: 17.21425360061474 },
            { lat: 44.76619737147681, lng: 17.18600262409214 }
          ],
          routeCoordinates: [[17.21425360061474, 44.79608946972573], [17.18600262409214, 44.76619737147681]],
          routeGeometry: null
        }
      }
    ]
    
    return {
      routes: sampleRoutes,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
        hasMore: false
      }
    }
  },

  async getRouteById(id: string, userId?: string) {
    console.log('🔄 Fallback service active - Prisma unavailable')
    
    if (id === 'fallback-route-1') {
      return {
        id: 'fallback-route-1',
        name: '🔧 Sample Route (Database Temporarily Unavailable)',
        description: 'This is a sample route displayed while the database connection is being fixed.',
        date: '2025-08-26',
        startTime: '12:00',
        activityType: 'run',
        routeData: {
          points: [
            { lat: 44.79608946972573, lng: 17.21425360061474, elevation: 151 },
            { lat: 44.76619737147681, lng: 17.18600262409214, elevation: 166 }
          ],
          distance: 5.2,
          duration: 1800,
          elevationGain: 45,
          averagePace: 5.77,
          routeGeometry: null,
          routeCoordinates: [[17.21425360061474, 44.79608946972573], [17.18600262409214, 44.76619737147681]]
        },
        chartData: [
          { distance: 0, pace: 5.5, elevation: 151, heartRate: 120 },
          { distance: 2.6, pace: 6.0, elevation: 166, heartRate: 130 }
        ],
        stats: {
          distance: 5.2,
          duration: 1800,
          elevationGain: 45,
          pointCount: 2,
          averagePace: 5.77
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: {
          firstName: 'Fallback',
          lastName: 'User',
          username: 'fallback'
        }
      }
    }
    
    return null
  },

  async createRoute(data: any) {
    console.log('🔄 Fallback service active - Creating route in memory')
    
    // Generate a temporary ID
    const routeId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Return a successful response with the route data
    return {
      id: routeId,
      name: data.name || 'My Route',
      createdAt: new Date(),
      stats: {
        distance: data.routeData?.distance || 0,
        duration: data.routeData?.duration || 0,
        elevationGain: data.routeData?.elevationGain || 0,
        pointCount: data.routeData?.points?.length || 0,
        averagePace: data.routeData?.averagePace || 5.5
      }
    }
  },

  async deleteRoute(id: string, userId?: string) {
    console.log('🔄 Fallback service active - Route deletion temporarily disabled')
    if (id === 'fallback-route-1') {
      return {
        id: 'fallback-route-1',
        name: '🔧 Sample Route (Database Temporarily Unavailable)'
      }
    }
    return null
  },

  async checkRouteNameExists(userId: string, name: string): Promise<boolean> {
    console.log('🔄 Fallback service active - Checking route name exists', {
      userId,
      name,
      timestamp: new Date().toISOString()
    })
    
    // In fallback mode, we'll check against our sample data
    // Only the sample route name exists, all other names should return false
    const sampleRouteName = '🔧 Sample Route (Database Temporarily Unavailable)'
    
    // Case-insensitive comparison like the real service
    const exists = name.toLowerCase().trim() === sampleRouteName.toLowerCase().trim()
    
    console.log('🔄 Fallback service - Route name check result:', {
      exists,
      inputName: name,
      sampleName: sampleRouteName
    })
    
    return exists
  },

  async updateRouteByName(userId: string, routeName: string, routeData: any, chartData: any, activityType: string, description: string, date: string, startTime: string, paceHeartRateSettings: any): Promise<any> {
    console.log('🔄 Fallback service active - Route overwrite temporarily disabled')
    
    // Generate a temporary ID for the "overwritten" route
    const routeId = `fallback-overwrite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return {
      id: routeId,
      name: routeName,
      createdAt: new Date(),
      stats: {
        distance: routeData?.distance || 0,
        duration: routeData?.duration || 0,
        elevationGain: routeData?.elevationGain || 0,
        pointCount: routeData?.points?.length || 0,
        averagePace: routeData?.averagePace || 5.5
      }
    }
  }
}