import { db } from './prisma'
import { Prisma } from '@prisma/client'
import type { RouteData, RoutePoint } from '@/types'

// Extend Prisma client with PostGIS helpers
class DatabaseService {
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

  // Create a new route with PostGIS geometry
  async createRoute({
    userId,
    name,
    description,
    routeData,
    isPublic = false,
    activityType = 'RUN',
    tags = []
  }: {
    userId: string
    name: string
    description?: string
    routeData: RouteData
    isPublic?: boolean
    activityType?: 'RUN' | 'BIKE' | 'WALK' | 'HIKE'
    tags?: string[]
  }) {
    const lineString = this.routePointsToLineString(routeData.points)

    try {
      const route = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Create the route with PostGIS geometry
        const newRoute = await tx.$executeRaw`
          INSERT INTO routes (
            id, name, description, geometry, distance, duration, 
            \"elevationGain\", \"averagePace\", \"activityType\", \"pointCount\",
            \"isPublic\", \"userId\", \"createdAt\", \"updatedAt\"
          ) VALUES (
            gen_random_uuid()::text,
            ${name},
            ${description || ''},
            ST_GeomFromText(${lineString}, 4326),
            ${routeData.distance},
            ${routeData.duration},
            ${routeData.elevationGain},
            ${routeData.averagePace},
            ${activityType}::activity_type,
            ${routeData.points.length},
            ${isPublic},
            ${userId},
            NOW(),
            NOW()
          )
          RETURNING id
        `

        // Get the created route ID
        const routeResult = await tx.$queryRaw`
          SELECT id FROM routes WHERE \"userId\" = ${userId} 
          ORDER BY \"createdAt\" DESC LIMIT 1
        ` as [{ id: string }]
        
        const routeId = routeResult[0]?.id
        if (!routeId) throw new Error('Failed to create route')

        // Insert waypoints
        for (let i = 0; i < routeData.points.length; i++) {
          const point = routeData.points[i]
          const pointGeometry = this.routePointToPoint(point)
          
          await tx.$executeRaw`
            INSERT INTO route_waypoints (
              id, \"routeId\", location, sequence, elevation
            ) VALUES (
              gen_random_uuid()::text,
              ${routeId},
              ST_GeomFromText(${pointGeometry}, 4326),
              ${i},
              ${point.elevation || 0}
            )
          `
        }

        // Add tags if provided
        if (tags.length > 0) {
          for (const tagName of tags) {
            // Find or create tag
            let tag = await tx.tag.findUnique({ where: { name: tagName } })
            if (!tag) {
              tag = await tx.tag.create({
                data: { name: tagName }
              })
            }

            // Link tag to route
            await tx.routeTag.create({
              data: {
                routeId,
                tagId: tag.id
              }
            })
          }
        }

        return routeId
      })

      return route
    } catch (error) {
      console.error('Error creating route:', error)
      throw new Error('Failed to create route')
    }
  }

  // Find routes within a bounding box
  async findRoutesInBounds({
    minLat,
    minLng,
    maxLat,
    maxLng,
    activityType,
    limit = 50
  }: {
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
    activityType?: string
    limit?: number
  }) {
    const activityFilter = activityType ? `AND \"activityType\" = '${activityType}'::activity_type` : ''
    
    const routes = await this.prisma.$queryRaw`
      SELECT 
        id, name, description, distance, duration, 
        \"elevationGain\", \"activityType\", \"createdAt\",
        ST_AsGeoJSON(geometry) as geometry_json
      FROM routes 
      WHERE \"isPublic\" = true
      AND ST_Intersects(
        geometry,
        ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
      )
      ${activityFilter}
      ORDER BY \"createdAt\" DESC
      LIMIT ${limit}
    `

    return routes
  }

  // Find nearby routes
  async findNearbyRoutes({
    lat,
    lng,
    radiusKm = 10,
    activityType,
    limit = 20
  }: {
    lat: number
    lng: number
    radiusKm?: number
    activityType?: string
    limit?: number
  }) {
    const activityFilter = activityType ? `AND \"activityType\" = '${activityType}'::activity_type` : ''
    
    const routes = await this.prisma.$queryRaw`
      SELECT 
        id, name, description, distance, duration,
        \"elevationGain\", \"activityType\", \"createdAt\",
        ST_Distance(
          ST_Transform(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 3857),
          ST_Transform(geometry, 3857)
        ) / 1000.0 as distance_km
      FROM routes
      WHERE \"isPublic\" = true
      AND ST_DWithin(
        ST_Transform(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 3857),
        ST_Transform(geometry, 3857),
        ${radiusKm * 1000}
      )
      ${activityFilter}
      ORDER BY distance_km ASC
      LIMIT ${limit}
    `

    return routes
  }

  // Get route with full details
  async getRouteById(routeId: string, includeWaypoints = false) {
    const route = await this.prisma.$queryRaw<Array<{
      id: string;
      name: string;
      description: string | null;
      distance: number;
      duration: number;
      elevationGain: number;
      averagePace: number;
      activityType: string;
      pointCount: number;
      isPublic: boolean;
      createdAt: Date;
      geometry_json: string;
      firstName: string;
      lastName: string;
      username: string | null;
    }>>`
      SELECT 
        r.id, r.name, r.description, r.distance, r.duration,
        r.\"elevationGain\", r.\"averagePace\", r.\"activityType\",
        r.\"pointCount\", r.\"isPublic\", r.\"createdAt\",
        ST_AsGeoJSON(r.geometry) as geometry_json,
        u.\"firstName\", u.\"lastName\", u.username
      FROM routes r
      JOIN users u ON r.\"userId\" = u.id
      WHERE r.id = ${routeId}
    `

    if (route.length === 0) return null

    const routeData = route[0]

    if (includeWaypoints) {
      const waypoints = await this.prisma.$queryRaw`
        SELECT 
          sequence, elevation,
          ST_X(location) as lng,
          ST_Y(location) as lat
        FROM route_waypoints
        WHERE \"routeId\" = ${routeId}
        ORDER BY sequence ASC
      `;
      
      (routeData as any).waypoints = waypoints;
    }

    return routeData
  }

  // Calculate route statistics
  async calculateRouteStats(routeId: string) {
    const stats = await this.prisma.$queryRaw<Array<{
      calculated_distance: number;
      point_count: number;
      elevation_gain: number;
    }>>`
      SELECT 
        ST_Length(ST_Transform(geometry, 3857)) / 1000.0 as calculated_distance,
        ST_NPoints(geometry) as point_count,
        calculate_elevation_gain(${routeId}) as elevation_gain
      FROM routes
      WHERE id = ${routeId}
    `

    return stats[0] || null
  }

  // Search routes by name and tags
  async searchRoutes({
    query,
    tags,
    activityType,
    minDistance,
    maxDistance,
    page = 1,
    limit = 20
  }: {
    query?: string
    tags?: string[]
    activityType?: string
    minDistance?: number
    maxDistance?: number
    page?: number
    limit?: number
  }) {
    const offset = (page - 1) * limit
    
    // Build dynamic WHERE clause
    let whereClause = '\"isPublic\" = true'
    const params: (string | number)[] = []
    
    if (query) {
      whereClause += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`
      params.push(`%${query}%`)
    }
    
    if (activityType) {
      whereClause += ` AND \"activityType\" = $${params.length + 1}::activity_type`
      params.push(activityType)
    }
    
    if (minDistance !== undefined) {
      whereClause += ` AND distance >= $${params.length + 1}`
      params.push(minDistance)
    }
    
    if (maxDistance !== undefined) {
      whereClause += ` AND distance <= $${params.length + 1}`
      params.push(maxDistance)
    }

    // Add tag filtering if provided
    let tagJoin = ''
    if (tags && tags.length > 0) {
      tagJoin = `
        JOIN route_tags rt ON r.id = rt.\"routeId\"
        JOIN tags t ON rt.\"tagId\" = t.id
      `
      whereClause += ` AND t.name = ANY($${params.length + 1})`
      params.push(tags.join(','))
    }

    const routes = await this.prisma.$queryRawUnsafe(`
      SELECT DISTINCT
        r.id, r.name, r.description, r.distance, r.duration,
        r.\"elevationGain\", r.\"activityType\", r.\"createdAt\",
        u.\"firstName\", u.\"lastName\", u.username
      FROM routes r
      JOIN users u ON r.\"userId\" = u.id
      ${tagJoin}
      WHERE ${whereClause}
      ORDER BY r.\"createdAt\" DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, ...params, limit, offset)

    return routes
  }

  // Clean up and close connection
  async disconnect() {
    await this.prisma.$disconnect()
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()
export default databaseService

// Helper functions for route data conversion
export const routeHelpers = {
  // Convert PostGIS LineString to RoutePoint array
  lineStringToPoints: (lineString: string): RoutePoint[] => {
    // Parse WKT format: LINESTRING(lng lat, lng lat, ...)
    const coordinatesMatch = lineString.match(/LINESTRING\\((.+)\\)/)
    if (!coordinatesMatch) return []
    
    const coordinates = coordinatesMatch[1].split(', ')
    return coordinates.map(coord => {
      const [lng, lat] = coord.split(' ').map(Number)
      return { lat, lng }
    })
  },

  // Convert GeoJSON to RoutePoint array
  geoJsonToPoints: (geoJson: { type: string; coordinates: Array<[number, number]> }): RoutePoint[] => {
    if (geoJson.type !== 'LineString') return []
    
    return geoJson.coordinates.map(([lng, lat]: [number, number]) => ({
      lat,
      lng
    }))
  }
}