'use client'

import { useMemo } from 'react'
import { encodePolyline, simplifyRoute } from '../utils/polylineEncoder'

interface RouteStaticImageProps {
  route: {
    routeData?: {
      points?: Array<{ lat: number; lng: number }>
      routeCoordinates?: Array<[number, number]>
      routeGeometry?: {
        coordinates: Array<[number, number]>
        type: string
      }
    }
    previewData?: {
      points?: Array<{ lat: number; lng: number }>
      routeCoordinates?: Array<[number, number]>
      routeGeometry?: {
        coordinates: Array<[number, number]>
        type: string
      }
    }
    activityType: 'run' | 'bike'
    name: string
  }
  className?: string
  width?: number
  height?: number
}

export default function RouteStaticImage({ 
  route, 
  className = '', 
  width = 300, 
  height = 200 
}: RouteStaticImageProps) {
  const staticImageUrl = useMemo(() => {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    
    console.log('🗺️ RouteStaticImage: Processing route:', {
      routeName: route.name,
      activityType: route.activityType,
      hasPreviewData: !!route.previewData,
      hasRouteData: !!route.routeData,
      previewDataKeys: route.previewData ? Object.keys(route.previewData) : [],
      routeDataKeys: route.routeData ? Object.keys(route.routeData) : []
    })
    
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here') {
      console.error('Mapbox access token is not configured for RouteStaticImage')
      return null
    }

    // Use previewData if available, otherwise fall back to routeData
    const dataSource = route.previewData || route.routeData
    if (!dataSource) {
      console.warn('RouteStaticImage: No data source available for route:', route.name)
      return null
    }

    let coordinates: [number, number][] = []
    
    // Debug logging to understand what data we're receiving
    console.log('🗺️ RouteStaticImage Debug:', {
      hasPreviewData: !!route.previewData,
      hasRouteData: !!route.routeData,
      previewDataKeys: route.previewData ? Object.keys(route.previewData) : [],
      routeDataKeys: route.routeData ? Object.keys(route.routeData) : [],
      previewRouteCoordinatesCount: route.previewData?.routeCoordinates?.length || 0,
      routeDataRouteCoordinatesCount: route.routeData?.routeCoordinates?.length || 0,
      previewPointsCount: route.previewData?.points?.length || 0,
      routeDataPointsCount: route.routeData?.points?.length || 0,
      dataSourceKeys: dataSource ? Object.keys(dataSource) : []
    })
    let coordinateSource = 'none'

    // Priority-based coordinate extraction
    if (dataSource.routeCoordinates && Array.isArray(dataSource.routeCoordinates) && dataSource.routeCoordinates.length > 0) {
      coordinates = dataSource.routeCoordinates
      coordinateSource = 'routeCoordinates'
    } else if (dataSource.routeGeometry?.coordinates && Array.isArray(dataSource.routeGeometry.coordinates) && dataSource.routeGeometry.coordinates.length > 0) {
      coordinates = dataSource.routeGeometry.coordinates
      coordinateSource = 'routeGeometry.coordinates'
    } else if (dataSource.points && Array.isArray(dataSource.points) && dataSource.points.length > 0) {
      coordinates = dataSource.points.map(point => [point.lng, point.lat])
      coordinateSource = 'points'
    }

    console.log('🗺️ RouteStaticImage: Coordinate extraction:', {
      routeName: route.name,
      coordinateSource,
      totalCoordinates: coordinates.length,
      firstCoordinate: coordinates[0],
      lastCoordinate: coordinates[coordinates.length - 1],
      routeCoordinatesLength: dataSource.routeCoordinates?.length || 0,
      routeGeometryLength: dataSource.routeGeometry?.coordinates?.length || 0,
      pointsLength: dataSource.points?.length || 0
    })

    // Validate coordinates
    const validCoordinates = coordinates.filter(coord => 
      Array.isArray(coord) && 
      coord.length === 2 && 
      typeof coord[0] === 'number' && 
      typeof coord[1] === 'number' &&
      !isNaN(coord[0]) && !isNaN(coord[1]) &&
      coord[0] !== 0 && coord[1] !== 0
    )
    
    // Debug coordinate extraction results
    console.log('🗺️ Coordinate extraction results:', {
      coordinateSource,
      totalCoordinates: coordinates.length,
      firstCoordinate: coordinates[0],
      lastCoordinate: coordinates[coordinates.length - 1],
      sampleCoordinates: coordinates.slice(0, 5)
    })

    console.log('🗺️ RouteStaticImage: Coordinate validation:', {
      routeName: route.name,
      totalCoordinates: coordinates.length,
      validCoordinates: validCoordinates.length,
      invalidCoordinates: coordinates.length - validCoordinates.length
    })

    if (validCoordinates.length === 0) {
      console.warn('RouteStaticImage: No valid coordinates for route:', route.name, {
        originalCoordinates: coordinates.slice(0, 3), // Show first 3 for debugging
        coordinateSource
      })
      return null
    }

    // Simplify route to reduce URL length while preserving route shape
    // Use improved algorithm with smaller tolerance (~5.5m) and smart fallbacks
    const simplifiedCoordinates = simplifyRoute(validCoordinates)
    console.log(`[RouteStaticImage] ${route.name} - Simplified from ${validCoordinates.length} to ${simplifiedCoordinates.length} coordinates (${((simplifiedCoordinates.length / validCoordinates.length) * 100).toFixed(1)}% retained)`)
    
    // Encode coordinates as polyline
    const encodedPolyline = encodePolyline(simplifiedCoordinates)
    console.log(`[RouteStaticImage] ${route.name} - Encoded polyline length: ${encodedPolyline.length}`)

    // Calculate bounds
    const lngs = simplifiedCoordinates.map(coord => coord[0])
    const lats = simplifiedCoordinates.map(coord => coord[1])
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    // Add padding to bounds (20% on each side to ensure entire route is visible)
    // Also ensure minimum padding for very small routes
    const lngRange = maxLng - minLng
    const latRange = maxLat - minLat
    const lngPadding = Math.max(lngRange * 0.2, 0.001) // Minimum 0.001 degrees padding
    const latPadding = Math.max(latRange * 0.2, 0.001) // Minimum 0.001 degrees padding
    const paddedMinLng = minLng - lngPadding
    const paddedMaxLng = maxLng + lngPadding
    const paddedMinLat = minLat - latPadding
    const paddedMaxLat = maxLat + latPadding

    // Activity-specific route color
    const routeColor = route.activityType === 'bike' ? '10b981' : '3b82f6'
    
    // Create overlay with route line and start/end points using encoded polyline
    const startPoint = simplifiedCoordinates[0]
    const endPoint = simplifiedCoordinates[simplifiedCoordinates.length - 1]
    
    // Build overlay string: path + start marker + end marker
    const pathOverlay = `path-5+${routeColor}-0.8(${encodeURIComponent(encodedPolyline)})`
    const startMarker = `pin-s-a+22c55e(${startPoint[0]},${startPoint[1]})`
    const endMarker = simplifiedCoordinates.length > 1 ? `,pin-s-b+ef4444(${endPoint[0]},${endPoint[1]})` : ''
    
    const overlay = `${pathOverlay},${startMarker}${endMarker}`
    
    // Use auto-fit with bounding box to ensure entire route is visible
    // Format: /styles/v1/{username}/{style_id}/static/{overlay}/[{bbox}]/{width}x{height}{@2x}
    const bbox = `${paddedMinLng},${paddedMinLat},${paddedMaxLng},${paddedMaxLat}`
    const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${overlay}/[${bbox}]/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`
    
    console.log('🗺️ RouteStaticImage: Generated URL components:', {
      routeName: route.name,
      urlLength: staticUrl.length,
      bbox,
      bounds: { minLng, maxLng, minLat, maxLat },
      ranges: { lngRange, latRange },
      padding: { lngPadding, latPadding },
      paddedBounds: { paddedMinLng, paddedMaxLng, paddedMinLat, paddedMaxLat },
      simplifiedCoordinatesCount: simplifiedCoordinates.length,
      encodedPolylinePreview: encodedPolyline.substring(0, 50) + '...',
      pathOverlay,
      startMarker,
      endMarker,
      overlay,
      // Don't log the full URL as it contains the API key
      urlPreview: staticUrl.substring(0, 100) + '...'
    })
    
    return staticUrl
  }, [route, width, height])

  // Check if we have route data
  const hasRouteData = (route.previewData?.points?.length || route.previewData?.routeCoordinates?.length || route.previewData?.routeGeometry?.coordinates?.length) ||
                      (route.routeData?.points?.length || route.routeData?.routeCoordinates?.length || route.routeData?.routeGeometry?.coordinates?.length)

  if (!hasRouteData) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-xs">No route data</p>
        </div>
      </div>
    )
  }

  if (!staticImageUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-xs">Map unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={staticImageUrl}
        alt={`Route preview for ${route.name}`}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          console.error('❌ RouteStaticImage: Failed to load image:', {
            routeName: route.name,
            imageUrl: target.src,
            urlLength: target.src.length,
            naturalWidth: target.naturalWidth,
            naturalHeight: target.naturalHeight,
            error: e
          })
          
          // Replace with fallback content
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.innerHTML = `
              <div class="bg-gray-100 rounded-lg flex items-center justify-center w-full h-full">
                <div class="text-center text-gray-500">
                  <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p class="text-xs">Image failed</p>
                  <p class="text-xs text-gray-400">${route.name}</p>
                </div>
              </div>
            `
          }
        }}
        onLoad={() => {
          console.log('✅ RouteStaticImage: Successfully loaded image for route:', route.name)
        }}
      />
      
      {/* Activity type indicator */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-1">
        <span className="text-sm">{route.activityType === 'bike' ? '🚴' : '🏃'}</span>
      </div>
    </div>
  )
}