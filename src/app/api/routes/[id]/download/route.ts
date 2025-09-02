import { NextRequest, NextResponse } from 'next/server'
import { generalLimiter, getClientIP } from '@/lib/rateLimit'
import { isAuthenticated } from '@/lib/auth'
import { tokenService } from '@/lib/tokens'

// Helper function to get routes (same as in [id]/route.ts)
function getRoutes() {
  try {
    const fs = require('fs')
    const path = require('path')
    const routesPath = path.join(process.cwd(), 'temp-routes.json')
    if (fs.existsSync(routesPath)) {
      const data = fs.readFileSync(routesPath, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading routes:', error)
  }
  return []
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    await generalLimiter.check(request, 20, clientIP) // Lower limit for file downloads

    const { id } = params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'gpx'

    // Check if user has tokens for download
    const user = await isAuthenticated(request);
    const anonymousId = request.cookies.get('anonymousId')?.value || searchParams.get('anonymousId');
    
    let hasTokens = false;
    let tokenUserId = null;
    let tokenAnonymousId = null;
    
    if (user) {
      hasTokens = await tokenService.checkUserTokenBalance(user.id);
      tokenUserId = user.id;
    } else if (anonymousId) {
      hasTokens = await tokenService.checkAnonymousTokenBalance(anonymousId);
      tokenAnonymousId = anonymousId;
    }
    
    // If no tokens, return error
    if (!hasTokens) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient tokens. Please purchase tokens to download routes.',
        code: 'INSUFFICIENT_TOKENS'
      }, { status: 402 }); // 402 Payment Required
    }
    
    const allRoutes = getRoutes()
    const route = allRoutes.find((r: any) => r.id === id)
    
    if (!route) {
      return NextResponse.json({
        success: false,
        error: 'Route not found',
        code: 'ROUTE_NOT_FOUND'
      }, { status: 404 })
    }

    // Prepare data for file generation
    const fileGenerationData = {
      routeData: route.routeData,
      chartData: route.chartData || [],
      options: {
        name: route.name,
        date: new Date(route.createdAt).toISOString().split('T')[0],
        startTime: '09:00', // Default start time
        description: route.description || '',
        includeHeartRate: route.chartData?.some((d: any) => d.heartRate) || false,
        activityType: route.routeData.activityType || 'run'
      },
      format: format as 'gpx' | 'tcx' | 'both'
    }

    // Forward to the existing file generation endpoint
    const fileGenUrl = new URL('/api/files/generate', request.url)
    const fileGenResponse = await fetch(fileGenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fileGenerationData)
    })

    if (!fileGenResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate file',
        code: 'GENERATION_ERROR'
      }, { status: 500 })
    }

    // Return the file response
    const blob = await fileGenResponse.blob()
    const contentType = fileGenResponse.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = fileGenResponse.headers.get('content-disposition') || 
      `attachment; filename="${route.name.replace(/[^a-zA-Z0-9]/g, '_')}.${format}"`

    // Deduct tokens and track the download
    if (tokenUserId) {
      await tokenService.deductTokensFromUser(tokenUserId);
      await tokenService.trackDownload({
        routeId: id,
        userId: tokenUserId,
        format: format.toUpperCase() as any,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined
      });
    } else if (tokenAnonymousId) {
      await tokenService.deductTokensFromAnonymousUser(tokenAnonymousId);
      await tokenService.trackDownload({
        routeId: id,
        anonymousId: tokenAnonymousId,
        format: format.toUpperCase() as any,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined
      });
    }

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    })

  } catch (error) {
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        success: false,
        error: 'Too many download requests. Please wait a minute before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 })
    }

    console.error('Route download error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to download route',
      code: 'DOWNLOAD_ERROR'
    }, { status: 500 })
  }
}