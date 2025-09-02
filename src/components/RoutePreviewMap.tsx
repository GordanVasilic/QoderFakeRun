'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Set Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
if (MAPBOX_TOKEN && MAPBOX_TOKEN !== 'your_mapbox_token_here') {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

interface RoutePreviewMapProps {
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
  }
  className?: string
}

export default function RoutePreviewMap({ route, className = '' }: RoutePreviewMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    if (!mapContainer.current) return

    // Check for Mapbox token
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here') {
      console.error('Mapbox access token is not configured for RoutePreviewMap')
      return
    }

    // Initialize map with software rendering mode as per specifications
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [17.26, 45.14], // Default to Gradiška instead of [0,0]
      zoom: 10, // Better default zoom instead of 1
      interactive: false, // Disable interactions for preview
      attributionControl: false,
      logoPosition: 'bottom-left',
      // Software rendering mode configuration
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: true,
      antialias: false,
      renderWorldCopies: false
    })

    map.current.on('load', () => {
      setIsMapReady(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!map.current || !isMapReady) return

    // Comprehensive debugging - log all incoming data
    console.log('🔍 RoutePreviewMap: Full route object received:', {
      hasPreviewData: !!route.previewData,
      hasRouteData: !!route.routeData,
      activityType: route.activityType
    })
    
    if (route.previewData) {
      console.log('📊 RoutePreviewMap: previewData structure:', {
        hasPoints: !!route.previewData.points,
        pointsLength: route.previewData.points?.length || 0,
        hasRouteCoordinates: !!route.previewData.routeCoordinates,
        routeCoordinatesLength: route.previewData.routeCoordinates?.length || 0,
        hasRouteGeometry: !!route.previewData.routeGeometry,
        routeGeometryCoordinatesLength: route.previewData.routeGeometry?.coordinates?.length || 0,
        samplePoints: route.previewData.points?.slice(0, 3) || [],
        sampleCoordinates: route.previewData.routeCoordinates?.slice(0, 3) || [],
        sampleGeometryCoords: route.previewData.routeGeometry?.coordinates?.slice(0, 3) || []
      })
    }
    
    if (route.routeData) {
      console.log('📊 RoutePreviewMap: routeData structure:', {
        hasPoints: !!route.routeData.points,
        pointsLength: route.routeData.points?.length || 0,
        hasRouteCoordinates: !!route.routeData.routeCoordinates,
        routeCoordinatesLength: route.routeData.routeCoordinates?.length || 0,
        hasRouteGeometry: !!route.routeData.routeGeometry,
        routeGeometryCoordinatesLength: route.routeData.routeGeometry?.coordinates?.length || 0,
        samplePoints: route.routeData.points?.slice(0, 3) || [],
        sampleCoordinates: route.routeData.routeCoordinates?.slice(0, 3) || [],
        sampleGeometryCoords: route.routeData.routeGeometry?.coordinates?.slice(0, 3) || []
      })
    }

    // Use previewData if available, otherwise fall back to routeData
    const dataSource = route.previewData || route.routeData
    if (!dataSource) {
      console.warn('🗺️ RoutePreviewMap: No data source available')
      return
    }

    let coordinates: [number, number][] = []

    // Priority-based coordinate extraction for complete route visualization
    // 1. First try routeCoordinates (usually the complete route)
    if (dataSource.routeCoordinates && Array.isArray(dataSource.routeCoordinates) && dataSource.routeCoordinates.length > 0) {
      coordinates = dataSource.routeCoordinates
      console.log('🗺️ RoutePreviewMap: Using routeCoordinates with', coordinates.length, 'points')
    }
    // 2. Then try routeGeometry.coordinates (Mapbox LineString format)
    else if (dataSource.routeGeometry?.coordinates && Array.isArray(dataSource.routeGeometry.coordinates) && dataSource.routeGeometry.coordinates.length > 0) {
      coordinates = dataSource.routeGeometry.coordinates
      console.log('🗺️ RoutePreviewMap: Using routeGeometry.coordinates with', coordinates.length, 'points')
    }
    // 3. Fall back to points (waypoints) - less detailed but better than nothing
    else if (dataSource.points && Array.isArray(dataSource.points) && dataSource.points.length > 0) {
      coordinates = dataSource.points.map(point => [point.lng, point.lat])
      console.log('🗺️ RoutePreviewMap: Using points converted to coordinates with', coordinates.length, 'points (fallback)')
    }
    else {
      console.warn('🗺️ RoutePreviewMap: No valid coordinate data found in:', {
        hasRouteCoordinates: !!dataSource.routeCoordinates,
        hasRouteGeometry: !!dataSource.routeGeometry,
        hasPoints: !!dataSource.points,
        dataKeys: Object.keys(dataSource)
      })
      return
    }

    // Validate coordinates format and log statistics
    const validCoordinates = coordinates.filter(coord => 
      Array.isArray(coord) && 
      coord.length === 2 && 
      typeof coord[0] === 'number' && 
      typeof coord[1] === 'number' &&
      !isNaN(coord[0]) && !isNaN(coord[1]) &&
      coord[0] !== 0 && coord[1] !== 0 // Filter out null island coordinates
    )

    if (validCoordinates.length === 0) {
      console.warn('🗺️ RoutePreviewMap: No valid coordinates after filtering')
      return
    }

    coordinates = validCoordinates
    
    console.log('🗺️ RoutePreviewMap: Drawing route with', coordinates.length, 'valid coordinates', {
      firstCoord: coordinates[0],
      lastCoord: coordinates[coordinates.length - 1],
      filtered: validCoordinates.length !== coordinates.length ? 'yes' : 'no'
    })

    // Clear existing layers and sources safely
    try {
      if (map.current.getLayer('route-preview')) {
        map.current.removeLayer('route-preview')
      }
      if (map.current.getLayer('start-point')) {
        map.current.removeLayer('start-point')
      }
      if (map.current.getLayer('end-point')) {
        map.current.removeLayer('end-point')
      }
      if (map.current.getSource('route-preview')) {
        map.current.removeSource('route-preview')
      }
      if (map.current.getSource('start-point')) {
        map.current.removeSource('start-point')
      }
      if (map.current.getSource('end-point')) {
        map.current.removeSource('end-point')
      }
    } catch (error) {
      console.log('Error clearing existing layers:', error)
    }

    try {
      // Add route line with enhanced visibility
      map.current.addSource('route-preview', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      })

      // Activity-specific route styling - make very visible
      const routeColor = route.activityType === 'bike' ? '#10b981' : '#3b82f6'
      
      map.current.addLayer({
        id: 'route-preview',
        type: 'line',
        source: 'route-preview',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': routeColor,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 3,
            15, 6,
            18, 8
          ],
          'line-opacity': 1.0,
          'line-blur': 0
        }
      })

      // Add start point marker
      map.current.addSource('start-point', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: coordinates[0]
          }
        }
      })

      map.current.addLayer({
        id: 'start-point',
        type: 'circle',
        source: 'start-point',
        paint: {
          'circle-radius': 8, // Increased from 6
          'circle-color': '#22c55e',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Add end point marker if different from start
      if (coordinates.length > 1) {
        map.current.addSource('end-point', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: coordinates[coordinates.length - 1]
            }
          }
        })

        map.current.addLayer({
          id: 'end-point',
          type: 'circle',
          source: 'end-point',
          paint: {
            'circle-radius': 8, // Increased from 6
            'circle-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        })
      }

      // Fit map to route bounds with enhanced logic
      const bounds = new mapboxgl.LngLatBounds()
      coordinates.forEach(coord => {
        if (Array.isArray(coord) && coord.length === 2) {
          bounds.extend(coord)
        }
      })
      
      // Check if bounds are valid and calculate appropriate zoom
      if (!bounds.isEmpty()) {
        // Calculate the distance between bounds to determine appropriate max zoom
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        const latDiff = Math.abs(ne.lat - sw.lat)
        const lngDiff = Math.abs(ne.lng - sw.lng)
        const maxDiff = Math.max(latDiff, lngDiff)
        
        // Determine maxZoom based on route size - smaller routes can zoom in more
        let maxZoom = 16
        if (maxDiff < 0.001) maxZoom = 18  // Very small route
        else if (maxDiff < 0.01) maxZoom = 17   // Small route
        else if (maxDiff < 0.1) maxZoom = 16    // Medium route
        else maxZoom = 15  // Large route
        
        // Adjust padding based on container size - smaller containers need less padding
        const containerHeight = mapContainer.current?.offsetHeight || 150
        const containerWidth = mapContainer.current?.offsetWidth || 200
        const paddingScale = Math.min(containerHeight, containerWidth) / 150
        
        const padding = {
          top: Math.max(10, 20 * paddingScale),
          bottom: Math.max(10, 20 * paddingScale),
          left: Math.max(10, 20 * paddingScale),
          right: Math.max(10, 20 * paddingScale)
        }
        
        console.log('🎯 RoutePreviewMap: Fitting bounds with:', {
          coordinates: coordinates.length,
          maxDiff,
          maxZoom,
          padding,
          containerSize: { width: containerWidth, height: containerHeight }
        })
        
        map.current.fitBounds(bounds, {
          padding,
          duration: 0, // No animation for preview
          maxZoom // Dynamic max zoom based on route size
        })
      } else {
        console.warn('🗺️ RoutePreviewMap: Empty bounds, using fallback')
        // Use the center of all coordinates as fallback
        const avgLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length
        const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length
        map.current.setCenter([avgLng, avgLat])
        map.current.setZoom(15) // Good zoom level for single points or small routes
      }
      
    } catch (error) {
      console.error('Error adding route to map:', error)
    }

  }, [route, isMapReady])

  // Loading state - check all possible data sources
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

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Loading overlay */}
      {!isMapReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-6 h-6 mx-auto mb-1 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}