import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🧪 Testing Mapbox Tilequery API...')
  
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  
  console.log('🔑 Token check:', mapboxToken ? `Available (${mapboxToken.substring(0, 20)}...)` : 'Missing')
  
  if (!mapboxToken || mapboxToken === 'your_mapbox_token_here') {
    return NextResponse.json({
      success: false,
      error: 'Mapbox access token not configured'
    }, { status: 400 })
  }
  
  // Test with Ljubljana coordinates
  const testLat = 46.0569
  const testLng = 14.5058
  
  try {
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${testLng},${testLat}.json?` +
      new URLSearchParams({
        layers: 'contour',
        limit: '1',
        access_token: mapboxToken
      })
    
    console.log('🌐 Test URL:', url.replace(mapboxToken, 'TOKEN_HIDDEN'))
    
    const response = await fetch(url)
    
    console.log('📡 Response status:', response.status, response.statusText)
    
    if (response.ok) {
      const data = await response.json()
      console.log('📊 Response data:', JSON.stringify(data, null, 2))
      
      const elevation = data.features?.[0]?.properties?.ele || 0
      console.log('🏔️ Extracted elevation:', elevation, 'm')
      
      return NextResponse.json({
        success: true,
        data: {
          coordinates: { lat: testLat, lng: testLng },
          elevation: elevation,
          rawResponse: data
        }
      })
    } else {
      const errorText = await response.text()
      console.error('❌ API Error:', response.status, errorText)
      
      return NextResponse.json({
        success: false,
        error: `API returned ${response.status}: ${errorText}`
      }, { status: response.status })
    }
  } catch (error) {
    console.error('❌ Request failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}