import { NextRequest, NextResponse } from 'next/server'
import { routeLimiter, generalLimiter, getClientIP } from '@/lib/rateLimit'
import { RouteCreationSchema, RouteSearchSchema } from '@/lib/validations'
// Import with fallback handling
let routesService: typeof import('@/lib/routesService').routesService
try {
  routesService = require('@/lib/routesService').routesService
} catch (error) {
  console.warn('Prisma service unavailable, using fallback:', error instanceof Error ? error.message : String(error))
  routesService = require('@/lib/fallbackRoutesService').fallbackRoutesService
}
import { isAuthenticated } from '@/lib/auth'
import jwt from 'jsonwebtoken'

// Generate Strava-style route names
function generateRouteName(activityType: 'run' | 'bike' = 'run'): string {
  const today = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const activityLabel = activityType === 'bike' ? 'Ride' : 'Run'
  const dateStr = `${months[today.getMonth()]} ${today.getDate()}`
  
  return `My${activityLabel} ${dateStr}`
}

// POST /api/routes - Create a new route
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)
  
  // Apply rate limiting (stricter for route creation)
  try {
    await routeLimiter.check(request, 50, clientIP)
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Too many route creation requests. Please wait a minute before trying again.',
      code: 'RATE_LIMIT_EXCEEDED'
    }, { status: 429 })
  }

  try {
    // Get user from authentication
    let user: { id: string; email: string; role: string } | null = null

    // Try admin bypass first
    const authHeader = request.headers.get('authorization')
    console.log('🔍 POST route - Auth header present:', !!authHeader)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('🔍 POST route - Token extracted, length:', token.length)
      try {
        const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
        console.log('🔍 POST route - Using JWT secret:', JWT_SECRET)
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string }
        console.log('🔍 POST route - Token decoded successfully:', { id: decoded.id, email: decoded.email })
        if (decoded.id === 'cmeu1kwjg0000w5zgh3xdrxma' && decoded.email === 'admin@qoderfakerun.com') {
          user = {
            id: 'cmeu1kwjg0000w5zgh3xdrxma',
            email: 'admin@qoderfakerun.com',
            role: 'ADMIN'
          }
          console.log('✅ POST route - Admin bypass activated for user:', user.email)
        } else {
          console.log('❌ POST route - Admin bypass failed: ID or email mismatch')
        }
      } catch (jwtError) {
        console.log('❌ POST route - JWT verification failed:', jwtError instanceof Error ? jwtError.message : String(jwtError))
      }
    }

    // If admin bypass didn't work, try normal authentication
    if (!user) {
      try {
        user = await isAuthenticated(request)
      } catch (authError) {
        console.log('POST route - Normal auth error:', authError instanceof Error ? authError.message : String(authError))
      }
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const body = await request.json()
    
    console.log('🔍 POST /api/routes - Received payload:', {
      hasRouteData: !!body.routeData,
      routeDataKeys: body.routeData ? Object.keys(body.routeData) : [],
      pointsCount: body.routeData?.points?.length || 0,
      name: body.name,
      activityType: body.activityType,
      hasChartData: !!body.chartData,
      chartDataLength: body.chartData?.length || 0,
      date: body.date,
      startTime: body.startTime,
      hasPaceHeartRateSettings: !!body.paceHeartRateSettings,
      paceHeartRateSettings: body.paceHeartRateSettings
    })
    
    // Validate route data
    const validation = RouteCreationSchema.safeParse(body)
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues)
      return NextResponse.json({
        success: false,
        error: 'Invalid route data',
        details: validation.error.issues,
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }
    
    console.log('✅ Validation passed successfully')

    const { routeData, name, description, isPublic, tags, chartData, activityType, date, startTime, paceHeartRateSettings } = validation.data

    // Check route complexity
    if (routeData.points.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Route too complex. Maximum 1000 points allowed.',
        code: 'ROUTE_TOO_COMPLEX'
      }, { status: 400 })
    }

    // Generate name if not provided
    const routeName = name || generateRouteName(activityType)

    console.log('📝 ROUTE API - Detailed payload analysis:', {
      hasRouteGeometry: !!routeData.routeGeometry,
      routeGeometryCoordinatesCount: routeData.routeGeometry?.coordinates?.length || 0,
      hasRouteCoordinates: !!routeData.routeCoordinates,
      routeCoordinatesCount: routeData.routeCoordinates?.length || 0,
      hasRouteElevations: !!routeData.routeElevations,
      routeElevationsCount: routeData.routeElevations?.length || 0,
      waypointsCount: routeData.points?.length || 0,
      chartDataCount: chartData?.length || 0,
      routeDataKeys: Object.keys(routeData),
      firstRouteGeometryCoord: routeData.routeGeometry?.coordinates?.[0],
      firstRouteCoordinate: routeData.routeCoordinates?.[0],
      firstRouteElevation: routeData.routeElevations?.[0],
      firstWaypoint: routeData.points?.[0],
      firstChartData: chartData?.[0]
    })
    
    // Save route to database
    const savedRoute = await routesService.createRoute({
      userId: user.id,
      name: routeName,
      description,
      date,
      startTime,
      routeData,
      chartData,
      isPublic,
      activityType: activityType?.toUpperCase() as 'RUN' | 'BIKE',
      tags,
      paceHeartRateSettings
    })

    console.log(`Route created: ${savedRoute.id}, points: ${savedRoute.stats.pointCount}, user: ${user.id}`)

    return NextResponse.json({
      success: true,
      data: savedRoute,
      message: 'Route saved successfully to Supabase'
    })

  } catch (error) {
    console.error('Route creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create route',
      code: 'CREATION_ERROR'
    }, { status: 500 })
  }
}

// GET /api/routes - List routes with search and filtering
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request)
  
  // Apply rate limiting
  try {
    await generalLimiter.check(request, 100, clientIP)
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }, { status: 429 })
  }

  try {
    // Get user from authentication
    let user: { id: string; email: string; role: string } | null = null
    let userId: string | undefined = undefined

    // Try admin bypass first
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production') as { id: string; email: string }
        if (decoded.id === 'cmeu1kwjg0000w5zgh3xdrxma' && decoded.email === 'admin@qoderfakerun.com') {
          user = {
            id: 'cmeu1kwjg0000w5zgh3xdrxma',
            email: 'admin@qoderfakerun.com',
            role: 'ADMIN'
          }
          userId = 'cmeu1kwjg0000w5zgh3xdrxma'
          console.log('GET routes - Admin bypass activated for user:', user.email)
        }
      } catch (jwtError) {
        // JWT verification failed, try normal authentication
      }
    }

    // If admin bypass didn't work, try normal authentication
    if (!user) {
      try {
        user = await isAuthenticated(request)
        userId = user?.id
      } catch (authError) {
        console.log('GET routes - Normal auth error:', authError instanceof Error ? authError.message : String(authError))
      }
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || undefined
    const activityType = searchParams.get('activityType') || undefined
    const minDistance = searchParams.get('minDistance') ? parseFloat(searchParams.get('minDistance')!) : undefined
    const maxDistance = searchParams.get('maxDistance') ? parseFloat(searchParams.get('maxDistance')!) : undefined
    const minPace = searchParams.get('minPace') ? parseFloat(searchParams.get('minPace')!) : undefined
    const maxPace = searchParams.get('maxPace') ? parseFloat(searchParams.get('maxPace')!) : undefined
    const minElevationGain = searchParams.get('minElevationGain') ? parseFloat(searchParams.get('minElevationGain')!) : undefined
    const maxElevationGain = searchParams.get('maxElevationGain') ? parseFloat(searchParams.get('maxElevationGain')!) : undefined
    const minHeartRate = searchParams.get('minHeartRate') ? parseInt(searchParams.get('minHeartRate')!) : undefined
    const maxHeartRate = searchParams.get('maxHeartRate') ? parseInt(searchParams.get('maxHeartRate')!) : undefined
    const difficulty = searchParams.get('difficulty') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'name' | 'distance' | 'averagePace' | 'elevationGain' | 'difficulty') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // For admin user, don't filter by userId to see all routes
    const effectiveUserId = user.id === 'admin-temp-id' ? undefined : userId

    // Get routes from database
    const result = await routesService.getRoutes({
      userId: effectiveUserId,
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
      sortBy,
      sortOrder,
      page,
      limit
    })

    // Transform routes for response (add preview data)
    const transformedRoutes = result.routes.map((route: {
      id: string;
      name: string;
      description?: string;
      date?: string;
      startTime?: string;
      activityType: string;
      stats: {
        distance: number;
        duration: number;
        elevationGain: number;
        pointCount: number;
        averagePace: number;
        averageHeartRate?: number;
        difficulty?: string;
      };
      createdAt: Date;
      updatedAt: Date;
      paceHeartRateSettings?: {
        averagePace: number;
        paceInconsistency: number;
        includeHeartRate: boolean;
        averageHeartRate: number;
        heartRateVariability: number;
      };
      routeData?: {
        points: Array<{ lat: number; lng: number; elevation?: number; timestamp?: number; pace?: number; heartRate?: number; distanceFromStart?: number }>;
        distance: number;
        duration: number;
        elevationGain: number;
        averagePace: number;
        paceHeartRateSettings?: {
          averagePace: number;
          paceInconsistency: number;
          includeHeartRate: boolean;
          averageHeartRate: number;
          heartRateVariability: number;
        };
        routeGeometry?: {
          coordinates: Array<[number, number]>;
          type: string;
        };
        routeCoordinates?: Array<[number, number]>;
        routeElevations?: number[];
      };
    }) => ({
      id: route.id,
      name: route.name,
      description: route.description,
      date: route.date,
      startTime: route.startTime,
      activityType: route.activityType,
      stats: route.stats,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
      // Include pace and heart rate settings
      paceHeartRateSettings: route.paceHeartRateSettings,
      // Include preview data for map display
      previewData: {
        points: route.routeData?.points || [],
        routeCoordinates: route.routeData?.routeCoordinates || [],
        routeGeometry: route.routeData?.routeGeometry
      },
      // Include full route data for compatibility
      routeData: route.routeData
    }))

    return NextResponse.json({
      success: true,
      data: {
        routes: transformedRoutes,
        pagination: result.pagination
      }
    })

  } catch (error) {
    console.error('Failed to fetch routes:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch routes',
      code: 'DATABASE_ERROR'
    }, { status: 500 })
  }
}