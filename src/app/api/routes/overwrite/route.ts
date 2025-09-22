import { NextRequest, NextResponse } from 'next/server'
import { generalLimiter, getClientIP } from '@/lib/rateLimit'
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
import { RouteCreationSchema } from '@/lib/validations'

// PUT /api/routes/overwrite - Overwrite existing route
export async function PUT(request: NextRequest) {
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

    // Try admin bypass first
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string }
        if (decoded.id === 'cmeu1kwjg0000w5zgh3xdrxma' && decoded.email === 'admin@qoderfakerun.com') {
          user = {
            id: 'cmeu1kwjg0000w5zgh3xdrxma',
            email: 'admin@qoderfakerun.com',
            role: 'ADMIN'
          }
        }
      } catch (jwtError) {
        // JWT verification failed, continue with normal auth
      }
    }

    // If admin bypass didn't work, try normal authentication
    if (!user) {
      try {
        user = await isAuthenticated(request)
      } catch (authError) {
        // Normal auth failed
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
    const { routeData, chartData, activityType, name, description, date, startTime, paceHeartRateSettings } = body

    // Validate the route data
    const validationResult = RouteCreationSchema.safeParse({
      routeData,
      chartData,
      activityType,
      name,
      description,
      date,
      startTime,
      paceHeartRateSettings
    })

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid route data',
        details: validationResult.error.issues,
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Update the existing route
    const updatedRoute = await routesService.updateRouteByName(
      user.id,
      name,
      routeData,
      chartData,
      activityType,
      description,
      date,
      startTime,
      paceHeartRateSettings
    )

    return NextResponse.json({
      success: true,
      data: updatedRoute,
      message: 'Route updated successfully'
    })

  } catch (error) {
    console.error('Route overwrite error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to overwrite route',
      code: 'OVERWRITE_ERROR'
    }, { status: 500 })
  }
}