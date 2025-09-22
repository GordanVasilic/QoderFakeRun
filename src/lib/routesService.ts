import { db } from './prisma'
import type { RouteData, RoutePoint, ChartDataPoint, PaceHeartRateSettings } from '@/types'
import crypto from 'crypto'

// Routes service for handling route CRUD operations
class RoutesService {
  private prisma = db

  // Convert RoutePoint array to PostGIS LineString
  private routePointsToLineString(points: RoutePoint[]): string {
    if (points.length < 2) {
      throw new Error('Route must have at least 2 points')
    }

    const coordinates = points.map(point => `${point.lng} ${point.lat}`).join(', ')
    return `LINESTRING(${coordinates})`
  }

  // Convert RoutePoint to PostGIS Point
  private routePointToPoint(point: RoutePoint): string {
    return `POINT(${point.lng} ${point.lat})`
  }

  // Create a new route
  async createRoute({
    userId,
    name,
    description,
    date,
    startTime,
    routeData,
    chartData = [],
    isPublic = false,
    activityType = 'RUN',
    tags = [],
    paceHeartRateSettings
  }: {
    userId: string
    name: string
    description?: string
    date?: string
    startTime?: string
    routeData: RouteData
    chartData?: ChartDataPoint[]
    isPublic?: boolean
    activityType?: 'RUN' | 'BIKE' | 'WALK' | 'HIKE'
    tags?: string[]
    paceHeartRateSettings?: PaceHeartRateSettings
  }) {
    console.log('💾 RoutesService.createRoute - Received paceHeartRateSettings:', {
      hasPaceHeartRateSettings: !!paceHeartRateSettings,
      paceHeartRateSettings: paceHeartRateSettings,
      paceHeartRateSettingsType: typeof paceHeartRateSettings,
      paceHeartRateSettingsStringified: paceHeartRateSettings ? JSON.stringify(paceHeartRateSettings) : null
    })
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create LineString geometry from route points
        const coordinates = routeData.points.map(point => `${point.lng} ${point.lat}`).join(',');
        const lineStringWKT = `LINESTRING(${coordinates})`;
        
        // Log detailed route data for debugging
        console.log('💾 SAVING ROUTE - Detailed data analysis:', {
          hasRouteGeometry: !!routeData.routeGeometry,
          routeGeometryCoordinatesCount: routeData.routeGeometry?.coordinates?.length || 0,
          hasRouteCoordinates: !!routeData.routeCoordinates,
          routeCoordinatesCount: routeData.routeCoordinates?.length || 0,
          hasRouteElevations: !!routeData.routeElevations,
          routeElevationsCount: routeData.routeElevations?.length || 0,
          waypointsCount: routeData.points?.length || 0,
          chartDataCount: chartData?.length || 0
        })
        
        // Create LineString geometry from route data
        let lineString: string
        
        // Use complete route geometry if available (from Mapbox routing)
        if (routeData.routeGeometry && routeData.routeGeometry.coordinates && routeData.routeGeometry.coordinates.length > 0) {
          // Use the complete Mapbox route geometry
          const coordinates = routeData.routeGeometry.coordinates
            .map((coord: [number, number]) => `${coord[0]} ${coord[1]}`)
            .join(', ')
          lineString = `LINESTRING(${coordinates})`
          console.log('💾 Using complete Mapbox route geometry with', routeData.routeGeometry.coordinates.length, 'points')
        } else if (routeData.routeCoordinates && routeData.routeCoordinates.length > 0) {
          // Fallback to routeCoordinates
          const coordinates = routeData.routeCoordinates
            .map((coord: [number, number]) => `${coord[0]} ${coord[1]}`)
            .join(', ')
          lineString = `LINESTRING(${coordinates})`
          console.log('💾 Using route coordinates with', routeData.routeCoordinates.length, 'points')
        } else {
          // Final fallback to waypoints (straight lines)
          const coordinates = routeData.points
            .map(point => `${point.lng} ${point.lat}`)
            .join(', ')
          lineString = `LINESTRING(${coordinates})`
          console.log('⚠️ Fallback to waypoints only with', routeData.points.length, 'points')
        }

        // Create route using raw SQL to handle PostGIS geometry and JSONB arrays
        const routeId = await tx.$queryRaw`
          INSERT INTO routes (
            id, name, description, date, "startTime", geometry, distance, duration, 
            "elevationGain", "averagePace", "activityType", "pointCount", "isPublic", 
            "userId", "paceHeartRateSettings", "routeCoordinates", "routeElevations", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), ${name}, ${description}, ${date}, ${startTime}, 
            ST_GeomFromText(${lineString}, 4326), ${routeData.distance}, 
            ${routeData.duration}, ${routeData.elevationGain}, ${routeData.averagePace}, 
            ${activityType}::activity_type, ${routeData.points.length}, ${isPublic || false}, 
            ${userId}, ${paceHeartRateSettings ? JSON.stringify(paceHeartRateSettings) : null}::jsonb, 
            ${routeData.routeCoordinates ? JSON.stringify(routeData.routeCoordinates) : null}::jsonb,
            ${routeData.routeElevations ? JSON.stringify(routeData.routeElevations) : null}::jsonb, NOW(), NOW()
          ) RETURNING id
        ` as [{id: string}];
        
        const route = { id: routeId[0].id, name, createdAt: new Date() };

        // Insert waypoints using raw SQL to handle PostGIS geometry
        for (let i = 0; i < routeData.points.length; i++) {
          const point = routeData.points[i];
          await tx.$queryRaw`
            INSERT INTO route_waypoints (
              id, "routeId", location, sequence, elevation, timestamp, 
              "distanceFromStart", pace, "heartRate"
            ) VALUES (
              gen_random_uuid(), ${route.id}, ST_GeomFromText(${'POINT(' + point.lng + ' ' + point.lat + ')'}, 4326), 
              ${i}, ${point.elevation || 0}, ${point.timestamp || null}, 
              ${point.distanceFromStart || 0}, ${point.pace || null}, ${point.heartRate || null}
            )
          `;
        }

        // Insert chart data if provided
        if (chartData && chartData.length > 0) {
          const chartDataRecords = chartData.map((dataPoint, index) => ({
            routeId: route.id,
            distance: dataPoint.distance || 0,
            pace: dataPoint.pace || null,
            elevation: dataPoint.elevation || null,
            heartRate: dataPoint.heartRate || null,
            sequence: index
          }));

          await tx.routeChartData.createMany({
            data: chartDataRecords
          });
        }

        // Add tags if provided
        if (tags && tags.length > 0) {
          for (const tagName of tags) {
            // Find or create tag
            let tag = await tx.tag.findUnique({ where: { name: tagName } });
            if (!tag) {
              tag = await tx.tag.create({
                data: { name: tagName }
              });
            }

            // Link tag to route
            await tx.routeTag.create({
              data: {
                routeId: route.id,
                tagId: tag.id
              }
            });
          }
        }

        return {
          id: route.id,
          name: route.name,
          createdAt: route.createdAt,
          stats: {
            distance: routeData.distance,
            duration: routeData.duration,
            elevationGain: routeData.elevationGain,
            pointCount: routeData.points.length,
            averagePace: routeData.averagePace
          }
        }
      })

      return result
    } catch (error) {
      console.error('Error creating route:', error)
      throw new Error('Failed to create route')
    }
  }

  // Check if a route name already exists for a user
  async checkRouteNameExists(userId: string, name: string): Promise<boolean> {
    try {
      console.log('🔍 DB checkRouteNameExists: Query parameters:', {
        userId,
        name,
        timestamp: new Date().toISOString()
      })
      
      const existingRoute = await this.prisma.route.findFirst({
        where: {
          userId,
          name: {
            equals: name,
            mode: 'insensitive' // Case-insensitive comparison
          }
        },
        select: {
          id: true
        }
      })
      
      console.log('🔍 DB checkRouteNameExists: Query result:', {
        userId,
        name,
        existingRoute,
        exists: !!existingRoute,
        timestamp: new Date().toISOString()
      })
      
      return !!existingRoute
    } catch (error) {
      console.error('Error checking route name:', error)
      throw new Error('Failed to check route name')
    }
  }

  // Update existing route (overwrite)
  async updateRouteByName(userId: string, routeName: string, routeData: RouteData, chartData: ChartDataPoint[], activityType: string, description: string, date: string, startTime: string, paceHeartRateSettings: PaceHeartRateSettings): Promise<{ id: string; name: string; description?: string; routeData: RouteData; chartData: ChartDataPoint[]; activityType: string; date?: string; startTime?: string; paceHeartRateSettings?: PaceHeartRateSettings }> {
    try {
      // Debug: Log the routeData to see what fields it contains
      console.log('🔍 updateRouteByName: routeData keys:', Object.keys(routeData))
      console.log('🔍 updateRouteByName: routeData content:', JSON.stringify(routeData, null, 2))
      
      // Find the existing route
      const existingRoute = await this.prisma.route.findFirst({
        where: {
          userId: userId,
          name: {
            equals: routeName,
            mode: 'insensitive'
          }
        }
      })

      if (!existingRoute) {
        throw new Error('Route not found')
      }

      // Prepare update data with only valid Route model fields
      const updateData = {
        name: routeName,
        description: description || '',
        activityType: activityType.toUpperCase() as 'RUN' | 'BIKE' | 'WALK' | 'HIKE',
        date: date,
        startTime: startTime,
        distance: routeData.distance || 0,
        duration: routeData.duration || 0,
        elevationGain: routeData.elevationGain || 0,
        averagePace: routeData.averagePace || 0,
        averageHeartRate: routeData.averageHeartRate || null,
        difficulty: routeData.difficulty || 'EASY',
        isPublic: routeData.isPublic || false,
        paceHeartRateSettings: paceHeartRateSettings || null,
        updatedAt: new Date()
      }

      console.log('🔍 updateRouteByName: updateData keys:', Object.keys(updateData))
      console.log('🔍 updateRouteByName: updateData content:', JSON.stringify(updateData, null, 2))

      // Update the route with new data
      const updatedRoute = await this.prisma.route.update({
        where: {
          id: existingRoute.id
        },
        data: updateData
      })

      // Update route coordinates and elevations if provided
      if (routeData.coordinates && routeData.coordinates.length > 0) {
        await this.prisma.route.update({
          where: {
            id: updatedRoute.id
          },
          data: {
            routeCoordinates: routeData.coordinates,
            routeElevations: routeData.elevations || null,
            pointCount: routeData.coordinates.length,
            minElevation: routeData.minElevation || null,
            maxElevation: routeData.maxElevation || null
          }
        })
      }

      // Update waypoints if provided (skip for now as it requires PostGIS geometry handling)
      // TODO: Implement waypoint updates with proper PostGIS Point geometry
      if (routeData.waypoints && routeData.waypoints.length > 0) {
        console.log('Waypoint updates not yet implemented for PostGIS geometry')
      }

      // Update chart data if provided
      if (chartData && chartData.length > 0) {
        // Delete existing chart data
        await this.prisma.routeChartData.deleteMany({
          where: {
            routeId: updatedRoute.id
          }
        })

        // Create new chart data
        await this.prisma.routeChartData.createMany({
          data: chartData.map((point: ChartDataPoint, index: number) => ({
            routeId: updatedRoute.id,
            distance: point.distance || 0,
            elevation: point.elevation || 0,
            pace: point.pace || null,
            heartRate: point.heartRate || null,
            sequence: index
          }))
        })
      }

      return updatedRoute
    } catch (error) {
      console.error('Error updating route:', error)
      throw new Error('Failed to update route')
    }
  }

  // Get routes for a user with pagination and filtering
  async getRoutes({
    userId,
    query,
    activityType,
    minDistance,
    maxDistance,
    minPace,
    maxPace,
    minElevationGain,
    maxElevationGain,
    minHeartRate,
    maxHeartRate,
    difficulty,
    startDate,
    endDate,
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
    sortBy?: 'createdAt' | 'name' | 'distance' | 'averagePace' | 'elevationGain' | 'difficulty'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
  }) {
    const offset = (page - 1) * limit

    // Build WHERE conditions for Prisma
    const where: Record<string, unknown> = {}

    if (userId) {
      where.userId = userId
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    }

    if (activityType) {
      where.activityType = activityType.toUpperCase()
    }

    if (minDistance !== undefined || maxDistance !== undefined) {
      where.distance = {}
      if (minDistance !== undefined) {
        where.distance.gte = minDistance
      }
      if (maxDistance !== undefined) {
        where.distance.lte = maxDistance
      }
    }

    if (minPace !== undefined || maxPace !== undefined) {
      where.averagePace = {}
      if (minPace !== undefined) {
        where.averagePace.gte = minPace
      }
      if (maxPace !== undefined) {
        where.averagePace.lte = maxPace
      }
    }

    if (minElevationGain !== undefined || maxElevationGain !== undefined) {
      where.elevationGain = {}
      if (minElevationGain !== undefined) {
        where.elevationGain.gte = minElevationGain
      }
      if (maxElevationGain !== undefined) {
        where.elevationGain.lte = maxElevationGain
      }
    }

    if (minHeartRate !== undefined || maxHeartRate !== undefined) {
      where.averageHeartRate = {}
      if (minHeartRate !== undefined) {
        where.averageHeartRate.gte = minHeartRate
      }
      if (maxHeartRate !== undefined) {
        where.averageHeartRate.lte = maxHeartRate
      }
    }

    if (difficulty) {
      where.difficulty = difficulty.toUpperCase()
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    // Build ORDER BY for Prisma
    const orderBy: Record<string, 'asc' | 'desc'> = {}
    orderBy[sortBy] = sortOrder

    try {
      // Get routes using Prisma ORM
      const routes = await this.prisma.route.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          date: true,
          startTime: true,
          distance: true,
          duration: true,
          elevationGain: true,
          averagePace: true,
          averageHeartRate: true,
          difficulty: true,
          activityType: true,
          pointCount: true,
          isPublic: true,
          paceHeartRateSettings: true,
          routeCoordinates: true,
          routeElevations: true,
          createdAt: true,
          updatedAt: true
        }
      })

      // Get total count
      const total = await this.prisma.route.count({ where })

      // Get route geometries for all routes in batch
      const routeIds = routes.map(route => route.id)
      const routeGeometries = await this.prisma.$queryRaw<Array<{
        id: string;
        geometry: string;
      }>>`
        SELECT id, ST_AsGeoJSON(geometry) as geometry
        FROM routes 
        WHERE id = ANY(${routeIds})
      `

      // Get waypoints for all routes in batch
      const routeWaypoints = await this.prisma.$queryRaw<Array<{
        routeId: string;
        sequence: number;
        elevation: number | null;
        latitude: number;
        longitude: number;
      }>>`
        SELECT 
          "routeId",
          sequence,
          elevation,
          ST_Y(location) as latitude,
          ST_X(location) as longitude
        FROM route_waypoints 
        WHERE "routeId" = ANY(${routeIds})
        ORDER BY "routeId", sequence ASC
      `

      // Get chart data for all routes in batch
      const routeChartData = await this.prisma.routeChartData.findMany({
        where: {
          routeId: {
            in: routeIds
          }
        },
        orderBy: [
          { routeId: 'asc' },
          { sequence: 'asc' }
        ],
        select: {
          routeId: true,
          distance: true,
          pace: true,
          elevation: true,
          heartRate: true,
          sequence: true
        }
      })

      // Create maps for quick lookup
      const geometryMap = new Map()
      routeGeometries.forEach(rg => {
        try {
          geometryMap.set(rg.id, JSON.parse(rg.geometry))
        } catch (error) {
          console.error(`Error parsing geometry for route ${rg.id}:`, error)
          geometryMap.set(rg.id, null)
        }
      })

      const waypointsMap = new Map()
      routeWaypoints.forEach(wp => {
        if (!waypointsMap.has(wp.routeId)) {
          waypointsMap.set(wp.routeId, [])
        }
        waypointsMap.get(wp.routeId).push(wp)
      })

      const chartDataMap = new Map()
      routeChartData.forEach(cd => {
        if (!chartDataMap.has(cd.routeId)) {
          chartDataMap.set(cd.routeId, [])
        }
        chartDataMap.get(cd.routeId).push({
          distance: cd.distance,
          pace: cd.pace,
          elevation: cd.elevation,
          heartRate: cd.heartRate
        })
      })

      return {
          routes: routes.map(route => {
            const waypoints = waypointsMap.get(route.id) || []
            const routeGeometry = geometryMap.get(route.id)
            const chartData = chartDataMap.get(route.id) || []
            
            // Use stored JSONB arrays or fallback to reconstructed data
            const storedRouteCoordinates = route.routeCoordinates as number[][] | null
            const storedRouteElevations = route.routeElevations as number[] | null
            
            // Log route data for debugging
            console.log('📋 Route in list:', {
              id: route.id,
              name: route.name,
              hasStoredCoordinates: !!storedRouteCoordinates,
              storedCoordinatesCount: storedRouteCoordinates?.length || 0,
              hasStoredElevations: !!storedRouteElevations,
              storedElevationsCount: storedRouteElevations?.length || 0,
              fallbackCoordinatesCount: routeGeometry?.coordinates?.length || waypoints.length,
              fallbackElevationsCount: chartData.length
            })
            
            return {
              id: route.id,
              name: route.name,
              description: route.description,
              date: route.date,
              startTime: route.startTime,
              activityType: route.activityType.toLowerCase(),
              paceHeartRateSettings: route.paceHeartRateSettings,
              chartData: chartData,
              stats: {
                distance: route.distance,
                duration: route.duration,
                elevationGain: route.elevationGain,
                pointCount: route.pointCount,
                averagePace: route.averagePace,
                averageHeartRate: route.averageHeartRate,
                difficulty: route.difficulty
              },
              createdAt: route.createdAt,
              updatedAt: route.updatedAt,
              routeData: {
                points: waypoints.map((wp: { latitude: number; longitude: number; elevation: number | null }) => ({
                  lat: wp.latitude,
                  lng: wp.longitude,
                  elevation: wp.elevation
                })),
                coordinates: storedRouteCoordinates || routeGeometry?.coordinates || waypoints.map((wp: { latitude: number; longitude: number }) => [wp.longitude, wp.latitude]),
                routeGeometry: routeGeometry,
                routeCoordinates: storedRouteCoordinates || routeGeometry?.coordinates || waypoints.map((wp: { latitude: number; longitude: number }) => [wp.longitude, wp.latitude]),
                routeElevations: storedRouteElevations || chartData.map((cd: { elevation: number | null }) => cd.elevation || 0)
              }
            }
          }),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      }
    } catch (error) {
      console.error('Error getting routes:', error)
      throw new Error('Failed to get routes')
    }
  }

  // Get a single route by ID with full data
  async getRouteById(id: string, userId?: string) {
    try {
      // Build where clause for Prisma
      const where: { id: string; userId?: string } = { id }
      if (userId) {
        where.userId = userId
      }

      // Get route basic data using Prisma ORM
      const route = await this.prisma.route.findFirst({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          date: true,
          startTime: true,
          distance: true,
          duration: true,
          elevationGain: true,
          averagePace: true,
          activityType: true,
          pointCount: true,
          isPublic: true,
          paceHeartRateSettings: true,
          routeCoordinates: true,
          routeElevations: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      })
      
      if (!route) {
        return null
      }

      // Get waypoints using raw SQL to extract coordinates from PostGIS geometry
      const waypoints = await this.prisma.$queryRaw<Array<{
        sequence: number;
        elevation: number | null;
        latitude: number;
        longitude: number;
      }>>`
        SELECT 
          sequence,
          elevation,
          ST_Y(location) as latitude,
          ST_X(location) as longitude
        FROM route_waypoints 
        WHERE "routeId" = ${id}
        ORDER BY sequence ASC
      `

      // Get route geometry using raw SQL to extract PostGIS LineString
      const routeGeometryResult = await this.prisma.$queryRaw<Array<{
        geometry: string;
      }>>`
        SELECT ST_AsGeoJSON(geometry) as geometry
        FROM routes 
        WHERE id = ${id}
      `

      // Parse the geometry to GeoJSON format
      let routeGeometry = null
      if (routeGeometryResult.length > 0 && routeGeometryResult[0].geometry) {
        try {
          routeGeometry = JSON.parse(routeGeometryResult[0].geometry)
        } catch (error) {
          console.error('Error parsing route geometry:', error)
        }
      }

      // Get chart data using Prisma ORM
      const chartData = await this.prisma.routeChartData.findMany({
        where: { routeId: id },
        orderBy: { sequence: 'asc' },
        select: {
          distance: true,
          pace: true,
          elevation: true,
          heartRate: true,
          sequence: true
        }
      })

      // Use stored JSONB arrays or fallback to reconstructed data
      const storedRouteCoordinates = route.routeCoordinates as number[][] | null
      const storedRouteElevations = route.routeElevations as number[] | null
      
      // Build route data object
      const routeData: RouteData = {
        points: waypoints.map((wp: { latitude: number; longitude: number; elevation: number | null }) => ({
          lat: wp.latitude,
          lng: wp.longitude,
          elevation: wp.elevation
        })),
        distance: route.distance,
        duration: route.duration,
        elevationGain: route.elevationGain,
        averagePace: route.averagePace,
        routeGeometry: routeGeometry, // Contains actual PostGIS geometry as GeoJSON
        routeCoordinates: storedRouteCoordinates || routeGeometry?.coordinates || waypoints.map((wp: { latitude: number; longitude: number }) => [wp.longitude, wp.latitude]),
        routeElevations: storedRouteElevations || chartData.map(cd => cd.elevation || 0),
        paceHeartRateSettings: (route.paceHeartRateSettings as unknown as PaceHeartRateSettings) || undefined
      }
      
      console.log('📊 Route loaded:', {
        id: route.id,
        name: route.name,
        hasStoredCoordinates: !!storedRouteCoordinates,
        storedCoordinatesCount: storedRouteCoordinates?.length || 0,
        hasStoredElevations: !!storedRouteElevations,
        storedElevationsCount: storedRouteElevations?.length || 0,
        fallbackCoordinatesCount: routeGeometry?.coordinates?.length || waypoints.length,
        fallbackElevationsCount: chartData.length,
        waypointsCount: waypoints.length
      })

      return {
        id: route.id,
        name: route.name,
        description: route.description,
        date: route.date,
        startTime: route.startTime,
        activityType: route.activityType.toLowerCase(),
        routeData,
        chartData: chartData.map(cd => ({
          distance: cd.distance,
          pace: cd.pace,
          elevation: cd.elevation,
          heartRate: cd.heartRate
        })),
        stats: {
          distance: route.distance,
          duration: route.duration,
          elevationGain: route.elevationGain,
          pointCount: route.pointCount,
          averagePace: route.averagePace
        },
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
        creator: {
          firstName: route.user.firstName,
          lastName: route.user.lastName,
          username: route.user.username
        }
      }
    } catch (error) {
      console.error('Error getting route:', error)
      throw new Error('Failed to get route')
    }
  }

  // Delete a route
  async deleteRoute(id: string, userId?: string) {
    try {
      // Build where clause for Prisma
      const where: { id: string; userId?: string } = { id }
      if (userId) {
        where.userId = userId
      }

      // Check if route exists using Prisma ORM
      const route = await this.prisma.route.findFirst({
        where,
        select: {
          id: true,
          name: true
        }
      })
      
      if (!route) {
        return null
      }

      // Delete route using Prisma ORM (CASCADE will handle related data)
      await this.prisma.route.delete({
        where: { id: route.id }
      })

      return {
        id: route.id,
        name: route.name
      }
    } catch (error) {
      console.error('Error deleting route:', error)
      throw new Error('Failed to delete route')
    }
  }

  // Close connection
  async disconnect() {
    await this.prisma.$disconnect()
  }
}

// Export singleton instance
export const routesService = new RoutesService()