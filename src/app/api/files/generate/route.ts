import { NextRequest, NextResponse } from 'next/server'
import { fileLimiter, getClientIP } from '@/lib/rateLimit'
import { FileGenerationSchema } from '@/lib/validations'
import { generateGPX, generateRunSummary } from '@/utils/fileGeneration'
import { tokenService } from '@/utils/tokenService'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await fileLimiter.check(request, 10, clientIP); // 10 files per minute per IP

    // Parse and validate request body
    const body = await request.json();
    const validatedData = FileGenerationSchema.parse(body);

    const { routeData, options, chartData, format } = validatedData;

    console.log('🔍 GPX Generation Debug - Received request:', {
      routeDataKeys: Object.keys(routeData || {}),
      optionsKeys: Object.keys(options || {}),
      chartDataLength: chartData?.length || 0,
      format,
      includeHeartRate: options?.includeHeartRate,
      hasChartData: !!chartData,
      chartDataSample: chartData?.slice(0, 2)
    });

    // Debug heart rate data specifically
    if (chartData && chartData.length > 0) {
      const hrPoints = chartData.filter(p => p.heartRate && p.heartRate > 50 && p.heartRate < 250);
      console.log('💓 Heart Rate Debug:', {
        totalPoints: chartData.length,
        pointsWithHR: hrPoints.length,
        hrValues: hrPoints.slice(0, 5).map(p => p.heartRate),
        samplePoint: chartData[0]
      });
    } else {
      console.log('❌ No chartData received or chartData is empty');
    }
    
    // Check if user has tokens for download (skip in development)
    const isDevelopment = process.env.NODE_ENV === 'development';
    let anonymousId = null;
    
    if (!isDevelopment) {
      // Get anonymousId from request body or headers
      anonymousId = body.anonymousId || request.headers.get('x-anonymous-id');
      
      if (!anonymousId) {
        return NextResponse.json({
          success: false,
          error: 'Anonymous ID not found. Please refresh the page.',
          code: 'ANONYMOUS_ID_MISSING'
        }, { status: 400 })
      }
      
      const wallet = await tokenService.getWallet(anonymousId)
      
      if (wallet.balance < 1) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient tokens. Please purchase tokens to download routes.',
          code: 'INSUFFICIENT_TOKENS',
          current_balance: wallet.balance
        }, { status: 402 }) // 402 Payment Required
      }
    }
    
    // Debug logging for title and description
    console.log('🔍 Debug - Received options:', {
      name: options.name,
      description: options.description,
      date: options.date,
      startTime: options.startTime,
      activityType: options.activityType,
      includeHeartRate: options.includeHeartRate
    })
    
    // Enhanced debug logging for chart data and heart rate
    console.log('🔍 DEBUG: Full options object:', JSON.stringify(options, null, 2))
    console.log('🔍 DEBUG: RouteData paceHeartRateSettings:', JSON.stringify(routeData.paceHeartRateSettings, null, 2))
    
    if (chartData && chartData.length > 0) {
      const heartRateCount = chartData.filter(point => point.heartRate && point.heartRate > 0).length
      console.log('💓 Heart Rate Debug - Chart data:', chartData.length, 'points, with HR:', heartRateCount, 'points')
      if (heartRateCount > 0) {
        const sampleHR = chartData.filter(point => point.heartRate && point.heartRate > 0).slice(0, 3).map(p => p.heartRate)
        console.log('💓 Sample HR values:', sampleHR)
      } else {
        console.log('⚠️  Chart data exists but NO heart rate values found!')
        console.log('💓 Sample chart points (first 3):', chartData.slice(0, 3).map(p => ({ distance: p.distance, pace: p.pace, elevation: p.elevation, heartRate: p.heartRate })))
      }
    } else {
      console.log('⚠️  No chart data provided for heart rate')
    }
    
    // Critical debug: Check the actual includeHeartRate flag
    console.log('🚨 CRITICAL DEBUG - includeHeartRate flag:', options.includeHeartRate)
    console.log('🚨 CRITICAL DEBUG - Type of includeHeartRate:', typeof options.includeHeartRate)

    // Security checks
    if (routeData.points.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Route too complex. Maximum 1000 points allowed.',
        code: 'ROUTE_TOO_COMPLEX'
      }, { status: 400 })
    }

    if (routeData.distance > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Route too long. Maximum 1000km allowed.',
        code: 'ROUTE_TOO_LONG'
      }, { status: 400 })
    }

    // Generate GPX file only
    const files: { name: string; content: string; mimeType: string }[] = []
    
    const timestamp = new Date().toISOString().split('T')[0]
    const safeFileName = (options.name || 'route').toLowerCase().replace(/[^a-z0-9]/g, '-')

    const gpxContent = generateGPX(routeData, options, chartData)
    files.push({
      name: `${safeFileName}-${timestamp}.gpx`,
      content: gpxContent,
      mimeType: 'application/gpx+xml'
    })

    // Redeem token for download (skip in development)
    if (!isDevelopment && anonymousId) {
      try {
        const redemptionResult = await tokenService.redeemTokens(1, request.url, anonymousId)
        
        if (!redemptionResult.success) {
          return NextResponse.json({
            success: false,
            error: 'Failed to redeem token',
            code: 'TOKEN_REDEMPTION_FAILED'
          }, { status: 400 })
        }
      } catch (redemptionError) {
        return NextResponse.json({
          success: false,
          error: redemptionError instanceof Error ? redemptionError.message : 'Failed to redeem token',
          code: 'TOKEN_REDEMPTION_FAILED'
        }, { status: 400 })
      }
    }

    // Log file generation (for analytics)
    console.log(`📊 File generated: ${format} format, ${routeData.points.length} waypoints, ${routeData.routeCoordinates?.length || 0} route coordinates, IP: ${clientIP}`)
    
    if (routeData.routeCoordinates && routeData.routeCoordinates.length > 0) {
      console.log(`✅ Using FULL ROUTE with ${routeData.routeCoordinates.length} GPS points for realistic tracking`)
    } else {
      console.log(`⚠️  Using only ${routeData.points.length} waypoints - full route data not available`)
    }

    return NextResponse.json({
      success: true,
      data: {
        files,
        metadata: {
          routePoints: routeData.points.length,
          distance: routeData.distance,
          format,
          generatedAt: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    // Handle rate limiting
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        success: false,
        error: 'Too many file generation requests. Please wait a minute before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 })
    }

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: error.message
      }, { status: 400 })
    }

    // Handle other errors
    console.error('File generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// GET method for checking rate limits
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    
    return NextResponse.json({
      success: true,
      data: {
        ip: clientIP,
        limits: {
          fileGeneration: '10 requests per minute',
          maxRoutePoints: 1000,
          maxDistance: '1000 km'
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get rate limit info'
    }, { status: 500 })
  }
}