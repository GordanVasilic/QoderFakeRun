import { NextRequest, NextResponse } from 'next/server'
import { ElevationRequestSchema } from '@/lib/validations'
import sharp from 'sharp'

// Primary elevation service using Mapbox Terrain-RGB API
async function getMapboxTerrainRGBData(points: Array<{ lat: number; lng: number }>): Promise<Array<{ lat: number; lng: number; elevation: number }>> {
  console.log('🗺️ Fetching elevation data from Mapbox Terrain-RGB API...')
  console.log('📍 Points to process:', points.length)
  
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  
  console.log('🔑 Mapbox token check:', mapboxToken ? `Token available (${mapboxToken.substring(0, 20)}...)` : 'No token found')
  
  if (!mapboxToken || mapboxToken === 'your_mapbox_token_here') {
    console.error('❌ Mapbox access token not configured for Terrain-RGB API')
    throw new Error('Mapbox access token not configured')
  }

  const zoom = 14 // Balance between accuracy and performance
  const results: Array<{ lat: number; lng: number; elevation: number }> = []
  const tileCache = new Map<string, ImageData>()
  
  console.log(`🔄 Processing ${points.length} points using Terrain-RGB tiles at zoom ${zoom}`)
  
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    
    try {
      console.log(`📍 Point ${i + 1}: Processing ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`)
      
      // Convert lat/lng to tile coordinates
      const tileX = Math.floor((point.lng + 180) / 360 * Math.pow(2, zoom))
      const tileY = Math.floor((1 - Math.log(Math.tan(point.lat * Math.PI / 180) + 1 / Math.cos(point.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
      
      const tileKey = `${zoom}/${tileX}/${tileY}`
      console.log(`  🎯 Tile coordinates: ${tileKey}`)
      
      let imageData: ImageData | undefined = tileCache.get(tileKey)
      
      if (!imageData) {
        console.log(`  📡 Fetching new tile: ${tileKey}`)
        
        // Fetch the terrain RGB tile
        const tileUrl = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${tileKey}@2x.png?access_token=${mapboxToken}`
        console.log(`  🔗 Tile URL: ${tileUrl.replace(mapboxToken, 'TOKEN_HIDDEN')}`)
        
        const response = await fetch(tileUrl)
        
        if (!response.ok) {
          console.error(`  ❌ Tile fetch failed: ${response.status} ${response.statusText}`)
          results.push({
            lat: point.lat,
            lng: point.lng,
            elevation: 0
          })
          continue
        }
        
        const arrayBuffer = await response.arrayBuffer()
        console.log(`  ✅ Tile downloaded: ${arrayBuffer.byteLength} bytes`)
        
        // Decode PNG using Sharp to extract RGB values
        console.log('  🎨 Decoding PNG to extract RGB values...')
        const image = sharp(Buffer.from(arrayBuffer))
        const { data, info } = await image
          .raw()
          .toBuffer({ resolveWithObject: true })
        
        console.log(`  📐 Image dimensions: ${info.width}x${info.height}, channels: ${info.channels}`)
        
        // Create ImageData-like structure for caching
        imageData = {
          width: info.width,
          height: info.height,
          data: new Uint8ClampedArray(data.length),
          channels: info.channels || 3 // Store channel count
        } as ImageData & { channels: number }
        
        // Copy the raw RGB data
        for (let i = 0; i < data.length; i++) {
          imageData.data[i] = data[i]
        }
        
        // Cache the tile (limit cache size)
        if (tileCache.size >= 100) {
          const firstKey = tileCache.keys().next().value
          if (firstKey) {
            tileCache.delete(firstKey)
          }
        }
        tileCache.set(tileKey, imageData)
      } else {
        console.log(`  📋 Using cached tile: ${tileKey}`)
        // Ensure cached imageData has channels property (default to 3 for RGB)
        if (!(imageData as any).channels) {
          (imageData as any).channels = 3
        }
      }
      
      // Calculate pixel coordinates within the tile
      const pixelX = Math.floor(((point.lng + 180) / 360 * Math.pow(2, zoom) - tileX) * imageData.width)
      const pixelY = Math.floor(((1 - Math.log(Math.tan(point.lat * Math.PI / 180) + 1 / Math.cos(point.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom) - tileY) * imageData.height)
      
      console.log(`  🎯 Pixel coordinates: (${pixelX}, ${pixelY})`)
      
      // Ensure pixel coordinates are within bounds
      const clampedX = Math.max(0, Math.min(pixelX, imageData.width - 1))
      const clampedY = Math.max(0, Math.min(pixelY, imageData.height - 1))
      
      if (clampedX !== pixelX || clampedY !== pixelY) {
        console.log(`  ⚠️ Clamped coordinates: (${clampedX}, ${clampedY})`)
      }
      
      // Extract RGB values from the pixel (handle both RGB and RGBA formats)
      const channels = (imageData as any).channels || 3
      const pixelIndex = (clampedY * imageData.width + clampedX) * channels
      
      const r = imageData.data[pixelIndex]
      const g = imageData.data[pixelIndex + 1]
      const b = imageData.data[pixelIndex + 2]
      
      console.log(`  🎨 RGB values: R=${r}, G=${g}, B=${b}`)
      
      // Decode elevation from RGB values using Mapbox Terrain-RGB formula
      // elevation = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
      const elevation = -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1)
      
      console.log(`  🏔️ Calculated elevation: ${elevation.toFixed(1)}m`)
      
      results.push({
        lat: point.lat,
        lng: point.lng,
        elevation: Math.round(elevation)
      })
      
    } catch (error) {
      console.error(`  ❌ Error processing point ${i + 1}:`, error)
      results.push({
        lat: point.lat,
        lng: point.lng,
        elevation: 0
      })
    }
    
    // Small delay to avoid overwhelming the API (reduced for better performance)
    if (i < points.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 25)) // Reduced from 50ms to 25ms
    }
  }
  
  console.log('🏁 Mapbox Terrain-RGB processing complete:')
  console.log('  📊 Total points processed:', results.length)
  console.log('  🏔️ Elevations:', results.map(r => `${r.elevation}m`).join(', '))
  console.log('  📈 Elevation range:', Math.min(...results.map(r => r.elevation)), 'm to', Math.max(...results.map(r => r.elevation)), 'm')
  console.log('  💾 Tiles cached:', tileCache.size)
  
  return results
}

// Get elevation data using Mapbox Terrain-RGB API
async function getRouteElevation(points: Array<{ lat: number; lng: number }>): Promise<Array<{ lat: number; lng: number; elevation: number }>> {
  if (points.length === 0) {
    return []
  }

  try {
    console.log('🗺️ Getting elevation data from Mapbox Terrain-RGB API')
    console.log('📍 Point count:', points.length)
    
    const elevationData = await getMapboxTerrainRGBData(points)

    console.log('🏔️ Elevation data from Mapbox Terrain-RGB API:')
    console.log('  📍 Coordinates and elevations:')
    elevationData.forEach((point, index) => {
      console.log(`    ${index + 1}: (${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}) = ${point.elevation}m`)
    })
    console.log('  🎯 First point:', elevationData[0]?.elevation || 0, 'm')
    console.log('  🎯 Last point:', elevationData[elevationData.length - 1]?.elevation || 0, 'm')
    console.log('  📊 All elevations:', elevationData.map(p => `${p.elevation}m`).join(', '))

    return elevationData

  } catch (error) {
    console.error('❌ Failed to fetch elevation data from Mapbox:', error)
    
    // Fallback: Return points with zero elevation rather than failing
    console.log('🔄 Fallback: Using zero elevation for all points')
    return points.map(point => ({
      lat: point.lat,
      lng: point.lng,
      elevation: 0
    }))
  }
}

// Calculate elevation gain from route geometry using Mapbox elevation data
function calculateElevationGain(elevationPoints: Array<{ elevation: number }>): number {
  if (elevationPoints.length < 2) return 0
  
  let totalGain = 0
  let minElevation = Infinity
  let maxElevation = -Infinity
  let elevationChanges: Array<{ from: number; to: number; change: number; isUphill: boolean }> = []
  
  console.log('📊 Calculating elevation gain from Mapbox elevation data:')
  console.log('🔍 Detailed elevation analysis:')
  
  for (let i = 1; i < elevationPoints.length; i++) {
    const prevElev = elevationPoints[i - 1].elevation
    const currElev = elevationPoints[i].elevation
    const diff = currElev - prevElev
    
    elevationChanges.push({
      from: prevElev,
      to: currElev,
      change: diff,
      isUphill: diff > 0
    })
    
    if (diff > 0) {
      totalGain += diff
    }
    
    minElevation = Math.min(minElevation, currElev)
    maxElevation = Math.max(maxElevation, currElev)
  }
  
  // Log detailed analysis
  console.log(`  📍 Total points analyzed: ${elevationPoints.length}`)
  console.log(`  ⛰️ Elevation range: ${minElevation}m to ${maxElevation}m`)
  console.log(`  📏 Simple difference: ${maxElevation - minElevation}m`)
  console.log(`  📈 Calculated elevation gain: ${totalGain}m`)
  
  // Count uphill vs downhill segments
  const uphillChanges = elevationChanges.filter(c => c.isUphill)
  const downhillChanges = elevationChanges.filter(c => !c.isUphill && c.change !== 0)
  
  console.log(`  🔼 Uphill segments: ${uphillChanges.length} (total gain: ${uphillChanges.reduce((sum, c) => sum + c.change, 0)}m)`)
  console.log(`  🔽 Downhill segments: ${downhillChanges.length} (total loss: ${Math.abs(downhillChanges.reduce((sum, c) => sum + c.change, 0))}m)`)
  console.log(`  ➡️ Flat segments: ${elevationChanges.filter(c => c.change === 0).length}`)
  
  // Show first 10 elevation changes for debugging
  console.log('  🎯 First 10 elevation changes:')
  elevationChanges.slice(0, 10).forEach((change, index) => {
    const direction = change.change > 0 ? '🔼' : change.change < 0 ? '🔽' : '➡️'
    console.log(`    ${index + 1}: ${change.from}m → ${change.to}m (${change.change > 0 ? '+' : ''}${change.change}m) ${direction}`)
  })
  
  // Show last 10 elevation changes for debugging
  if (elevationChanges.length > 10) {
    console.log('  🎯 Last 10 elevation changes:')
    elevationChanges.slice(-10).forEach((change, index) => {
      const direction = change.change > 0 ? '🔼' : change.change < 0 ? '🔽' : '➡️'
      const actualIndex = elevationChanges.length - 10 + index + 1
      console.log(`    ${actualIndex}: ${change.from}m → ${change.to}m (${change.change > 0 ? '+' : ''}${change.change}m) ${direction}`)
    })
  }
  
  return totalGain
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    console.log('🔍 Request body received:', JSON.stringify(body, null, 2))
    const validatedData = ElevationRequestSchema.parse(body)

    const { points } = validatedData

    // Security check
    if (points.length > 100) {
      return NextResponse.json({
        success: false,
        error: 'Too many points. Maximum 100 points per request.',
        code: 'TOO_MANY_POINTS'
      }, { status: 400 })
    }

    console.log('🗺️ Using Mapbox Terrain-RGB API for elevation data')
    const elevationData = await getRouteElevation(points)
    
    // Calculate elevation gain
    const elevationGain = calculateElevationGain(elevationData)
    
    // Add index to elevation data
    const elevationDataWithIndex = elevationData.map((point, index) => ({
      ...point,
      index
    }))

    // Calculate statistics
    const elevations = elevationDataWithIndex.map(p => p.elevation)
    const minElevation = Math.min(...elevations)
    const maxElevation = Math.max(...elevations)
    const averageElevation = Math.round(elevations.reduce((sum, e) => sum + e, 0) / elevations.length)
    
    return NextResponse.json({
      success: true,
      data: {
        points: elevationDataWithIndex,
        statistics: {
          minElevation,
          maxElevation,
          totalGain: Math.round(elevationGain),
          averageElevation
        },
        metadata: {
          pointCount: points.length,
          source: 'mapbox-terrain-rgb-api',
          generatedAt: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: error.message
      }, { status: 400 })
    }

    console.error('Elevation API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get elevation data',
      code: 'ELEVATION_ERROR'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      service: 'Mapbox Terrain-RGB Elevation API',
      provider: 'Mapbox Terrain-RGB Tiles',
      limits: {
        maxPointsPerRequest: 100,
        rateLimit: 'Same as Mapbox account limits'
      },
      coverage: 'Global elevation data from terrain tiles',
      accuracy: 'High-resolution elevation from Mapbox Terrain-RGB tiles'
    }
  })
}