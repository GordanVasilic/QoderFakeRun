import { NextRequest, NextResponse } from 'next/server'
import { generalLimiter, getClientIP } from '@/lib/rateLimit'
import { tokenService } from '@/utils/tokenService'

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    await generalLimiter.check(request, 20, clientIP) // Lower limit for file downloads

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'gpx'

    // Get anonymous ID for token system
    const anonymousId = searchParams.get('anonymousId') || request.headers.get('x-anonymous-id')
    
    if (!anonymousId) {
      return NextResponse.json({
        success: false,
        error: 'Anonymous ID not found. Please refresh the page.',
        code: 'ANONYMOUS_ID_MISSING'
      }, { status: 400 })
    }
    
    // Check token balance
    const wallet = await tokenService.getWallet(anonymousId)
    
    if (wallet.balance < 1) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient tokens. Please purchase tokens to download routes.',
        code: 'INSUFFICIENT_TOKENS',
        current_balance: wallet.balance
      }, { status: 402 }) // 402 Payment Required
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
        'x-anonymous-id': anonymousId
      },
      body: JSON.stringify({ ...fileGenerationData, anonymousId })
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

    // Redeem token for download
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