import { NextRequest, NextResponse } from 'next/server'
// Import with fallback handling
let routesService: any
try {
  routesService = require('@/lib/routesService').routesService
} catch (error) {
  console.warn('Prisma service unavailable, using fallback:', error instanceof Error ? error.message : String(error))
  routesService = require('@/lib/fallbackRoutesService').fallbackRoutesService
}
import { isAuthenticated } from '@/lib/auth'
import { generalLimiter, getClientIP } from '@/lib/rateLimit'
import jwt from 'jsonwebtoken'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    await generalLimiter.check(request, 100, clientIP)

    // TEMPORARY: Handle admin user bypass for route fetching
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Verify JWT token manually for admin user
      const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-here';
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // If this is the admin temp user, create user object without database lookup
        if (decoded.id === 'cmeu1kwjg0000w5zgh3xdrxma' && decoded.email === 'admin@qoderfakerun.com') {
          user = {
            id: 'cmeu1kwjg0000w5zgh3xdrxma',
            email: 'admin@qoderfakerun.com',
            role: 'ADMIN'
          };
          console.log('GET route - Admin bypass activated for user:', user.email);
        }
      } catch (jwtError) {
        // JWT verification failed, try normal authentication
      }
    }
    
    // If admin bypass didn't work, try normal authentication
    if (!user) {
      try {
        user = await isAuthenticated(request);
      } catch (authError) {
        console.log('GET route - Normal auth error:', authError instanceof Error ? authError.message : String(authError));
      }
    }
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const { id } = await params
    
    // Get route from database
    const userId = user.id === 'cmeu1kwjg0000w5zgh3xdrxma' ? undefined : user.id
    const route = await routesService.getRouteById(id, userId)
    
    if (!route) {
      return NextResponse.json({
        success: false,
        error: 'Route not found',
        code: 'ROUTE_NOT_FOUND'
      }, { status: 404 })
    }
    
    console.log(`Route fetched: ${route.id}, Route name: ${route.name}, User: ${user.id}`);
    
    return NextResponse.json({
      success: true,
      data: route
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        success: false,
        error: 'Too many requests. Please wait a minute before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 })
    }

    console.error('Route fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch route',
      code: 'FETCH_ERROR'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    await generalLimiter.check(request, 50, clientIP)

    // TEMPORARY: Handle admin user bypass for delete endpoint
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Verify JWT token manually for admin user
      const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-here';
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // If this is the admin temp user, create user object without database lookup
        if (decoded.id === 'cmeu1kwjg0000w5zgh3xdrxma' && decoded.email === 'admin@qoderfakerun.com') {
          user = {
            id: 'cmeu1kwjg0000w5zgh3xdrxma',
            email: 'admin@qoderfakerun.com',
            role: 'ADMIN'
          };
          console.log('DELETE route - Admin bypass activated for user:', user.email);
        }
      } catch (jwtError) {
        // JWT verification failed, try normal authentication
      }
    }
    
    // If admin bypass didn't work, try normal authentication
    if (!user) {
      try {
        user = await isAuthenticated(request);
      } catch (authError) {
        console.log('DELETE route - Normal auth error:', authError instanceof Error ? authError.message : String(authError));
      }
    }
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const { id } = await params
    
    // Delete route from database
    const userId = user.id === 'cmeu1kwjg0000w5zgh3xdrxma' ? undefined : user.id
    const deletedRoute = await routesService.deleteRoute(id, userId)
    
    if (!deletedRoute) {
      return NextResponse.json({
        success: false,
        error: 'Route not found',
        code: 'ROUTE_NOT_FOUND'
      }, { status: 404 })
    }
    
    console.log(`Route deleted: ${deletedRoute.id}, Route name: ${deletedRoute.name}, User: ${user.id}`);
    
    return NextResponse.json({
      success: true,
      data: deletedRoute,
      message: 'Route deleted successfully from Supabase'
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        success: false,
        error: 'Too many requests. Please wait a minute before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 })
    }

    console.error('Route deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete route',
      code: 'DELETION_ERROR'
    }, { status: 500 })
  }
}