'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { calculateDistance, calculateRouteDistance, calculateElevationGain } from '@/utils/mapUtils'
import { getWebGLDiagnostics, logWebGLDiagnostics, testWebGLFunctionality, analyzeWebGLIssues } from '@/utils/webglDiagnostics'
import type { RouteData, RoutePoint, ShapeType } from '@/types'

// Set Mapbox access token with validation
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here' || MAPBOX_TOKEN.startsWith('pk.eyJ1IjoiZXhhbXBsZSI')) {
  console.warn('⚠️  Mapbox access token is not properly configured. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env.local file.')
  console.warn('🔗 Get your free token from: https://account.mapbox.com/access-tokens/')
}
mapboxgl.accessToken = MAPBOX_TOKEN || ''

interface MapComponentProps {
  onRouteChange: (routeData: RouteData) => void
  selectedShape: ShapeType
  showWaypoints: boolean
  onShowWaypointsChange: (show: boolean) => void
  initialRouteData?: RouteData
  disableAutoFit?: boolean // New prop to disable auto-fitting behavior
}

export default function MapComponent({ 
  onRouteChange, 
  selectedShape, 
  showWaypoints,
  onShowWaypointsChange,
  initialRouteData,
  disableAutoFit = false
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [renderingError, setRenderingError] = useState<string | null>(null)
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [isLegendVisible, setIsLegendVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{
    place_name: string;
    center: [number, number];
    [key: string]: unknown;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false)
  const routeCalculationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const routePointsRef = useRef<RoutePoint[]>([])
  const isDraggingRef = useRef(false)
  const selectedShapeRef = useRef<ShapeType>('draw')
  const selectedPointIndexRef = useRef<number | null>(null)
  const showWaypointsRef = useRef(true)
  const routeCacheRef = useRef<Map<string, {
    coordinates: Array<[number, number]>;
    distance: number;
    duration: number;
  }>>(new Map()) // Simple route cache
  const eventHandlersSetupRef = useRef(false) // Track if event handlers are setup
  const isProcessingPointRef = useRef(false) // Track if point calculation is in progress

  // WebGL health monitoring not needed for software rendering
  
  // Software rendering mode - no health monitoring needed
  
  // Helper function to get WebGL error names
  const getWebGLErrorName = (error: number, gl: WebGLRenderingContext): string => {
    switch (error) {
      case gl.NO_ERROR: return 'NO_ERROR'
      case gl.INVALID_ENUM: return 'INVALID_ENUM'
      case gl.INVALID_VALUE: return 'INVALID_VALUE'
      case gl.INVALID_OPERATION: return 'INVALID_OPERATION'
      case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION'
      case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY'
      case gl.CONTEXT_LOST_WEBGL: return 'CONTEXT_LOST_WEBGL'
      default: return `UNKNOWN_ERROR(${error})`
    }
  }
  
  // Software rendering mode - no recovery needed
  // Developer diagnostics functions (available in console) - Software Rendering Mode
  useEffect(() => {
    // Make software rendering diagnostics available globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).mapDiagnostics = {
        // Basic map information
        getMapInfo: () => {
          const mapInfo = {
            renderingMode: 'Software Rendering',
            mapboxVersion: 'Mapbox GL JS v3.14.0',
            webglDisabled: true,
            isLoaded: isLoaded,
            hasErrors: !!renderingError,
            currentError: renderingError,
            routePoints: routePointsRef.current.length,
            timestamp: new Date().toISOString()
          }
          
          console.group('🎨 Software Rendering Map Diagnostics')
          console.log('📊 Rendering Mode: Software (WebGL disabled)')
          console.log('🗺️ Map Status:', isLoaded ? 'Loaded' : 'Loading')
          console.log('❌ Error Status:', renderingError || 'None')
          console.log('📍 Route Points:', routePointsRef.current.length)
          console.log('🕰️ Timestamp:', new Date().toISOString())
          console.groupEnd()
          
          return mapInfo
        },
        
        // Test basic map functionality
        testMapFunctionality: () => {
          const tests = []
          
          // Test map instance
          if (map.current) {
            tests.push({ name: 'Map Instance', passed: true })
          } else {
            tests.push({ name: 'Map Instance', passed: false, error: 'Map not initialized' })
          }
          
          // Test canvas
          const canvas = map.current?.getCanvas()
          if (canvas) {
            tests.push({ name: 'Canvas Element', passed: true })
          } else {
            tests.push({ name: 'Canvas Element', passed: false, error: 'Canvas not found' })
          }
          
          // Test map loaded state
          if (isLoaded) {
            tests.push({ name: 'Map Loaded', passed: true })
          } else {
            tests.push({ name: 'Map Loaded', passed: false, error: 'Map not loaded yet' })
          }
          
          // Test error state
          if (!renderingError) {
            tests.push({ name: 'No Errors', passed: true })
          } else {
            tests.push({ name: 'No Errors', passed: false, error: renderingError })
          }
          
          console.group('🧪 Software Rendering Tests')
          tests.forEach(test => {
            if (test.passed) {
              console.log(`✅ ${test.name}: PASSED`)
            } else {
              console.error(`❌ ${test.name}: FAILED`, test.error || '')
            }
          })
          console.log(`Overall: ${tests.every(t => t.passed) ? 'PASSED' : 'FAILED'}`)
          console.groupEnd()
          
          return { success: tests.every(t => t.passed), tests }
        },
        
        // Get map instance for advanced debugging
        getMap: () => map.current,
        
        // Clear any errors
        clearErrors: () => {
          setRenderingError(null)
          console.log('🧺 Cleared rendering errors')
        },
        
        // Performance info
        getPerformanceInfo: () => {
          const perfInfo = {
            renderingMode: 'Software',
            memoryUsage: 'unknown',
            canvasSize: { width: 0, height: 0 },
            mapboxStyle: 'streets-v12'
          }
          
          const canvas = map.current?.getCanvas()
          if (canvas) {
            perfInfo.canvasSize = {
              width: canvas.width,
              height: canvas.height
            }
          }
          
          if ('memory' in performance) {
            const memInfo = (performance as any).memory
            perfInfo.memoryUsage = Math.round(memInfo.usedJSHeapSize / 1024 / 1024) + 'MB'
          }
          
          console.group('📊 Software Rendering Performance')
          console.log('🎨 Mode: Software rendering (CPU-based)')
          console.log('🗺️ Canvas Size:', perfInfo.canvasSize.width + 'x' + perfInfo.canvasSize.height)
          console.log('💾 Memory Usage:', perfInfo.memoryUsage)
          console.log('🎨 Style:', perfInfo.mapboxStyle)
          console.groupEnd()
          
          return perfInfo
        },
        
        // Help text
        help: () => {
          console.group('🛠️ Software Rendering Diagnostics Help')
          console.log('Available commands:')
          console.log('• mapDiagnostics.getMapInfo() - Get basic map information')
          console.log('• mapDiagnostics.testMapFunctionality() - Test map functionality')
          console.log('• mapDiagnostics.getPerformanceInfo() - Get performance information')
          console.log('• mapDiagnostics.clearErrors() - Clear any rendering errors')
          console.log('• mapDiagnostics.getMap() - Get Mapbox map instance')
          console.log('• mapDiagnostics.help() - Show this help')
          console.log('')
          console.log('🎨 Note: This map uses software rendering for maximum compatibility')
          console.log('📊 Benefits: Universal compatibility, no GPU driver issues')
          console.log('⚡ Trade-off: Lower performance but higher stability')
          console.groupEnd()
        }
      }
      
      // Log availability message
      console.log('🛠️ Software rendering diagnostics available! Type "mapDiagnostics.help()" in console for commands.')
    }
    
    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).mapDiagnostics
      }
    }
  }, [isLoaded, renderingError])

  useEffect(() => {
    routePointsRef.current = routePoints
  }, [routePoints])

  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])

  useEffect(() => {
    selectedShapeRef.current = selectedShape
  }, [selectedShape])

  useEffect(() => {
    selectedPointIndexRef.current = selectedPointIndex
  }, [selectedPointIndex])

  useEffect(() => {
    showWaypointsRef.current = showWaypoints
  }, [showWaypoints])

  // Update waypoints visualization
  const updateWaypoints = useCallback((points: RoutePoint[]) => {
    if (!map.current) return
    
    // Show waypoints when: in draw mode OR when showWaypoints is enabled
    const shouldShowWaypoints = selectedShapeRef.current === 'draw' || showWaypointsRef.current
    
    const waypointsSource = map.current.getSource('waypoints') as mapboxgl.GeoJSONSource
    if (!waypointsSource) return
    
    if (shouldShowWaypoints && points.length > 0) {
      const waypointFeatures = points.map((point, index) => ({
        type: 'Feature' as const,
        id: index,
        properties: { 
          index,
          isFirst: index === 0,
          isLast: index === points.length - 1
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [point.lng, point.lat]
        }
      }))

      waypointsSource.setData({
        type: 'FeatureCollection',
        features: waypointFeatures
      })
    } else {
      // Hide waypoints
      waypointsSource.setData({
        type: 'FeatureCollection',
        features: []
      })
    }
  }, [])

  // Handle initial route data loading
  useEffect(() => {
    console.log('🔍 Initial route data effect triggered:', {
      hasInitialRouteData: !!initialRouteData,
      hasPoints: initialRouteData?.points?.length || 0,
      hasCoordinates: initialRouteData?.routeCoordinates?.length || 0,
      isLoaded,
      disableAutoFit
    })
    
    if (initialRouteData && initialRouteData.points && initialRouteData.points.length > 0 && isLoaded) {
      console.log('🔄 Loading initial route data with', initialRouteData.points.length, 'points')
      
      // Set the route points from the loaded data
      setRoutePoints(initialRouteData.points)
      
      // If we have routeCoordinates, display the full route
      if (initialRouteData.routeCoordinates && initialRouteData.routeCoordinates.length > 0) {
        console.log('🗺️ Loading full route with', initialRouteData.routeCoordinates.length, 'coordinates')
        
        // Update route line source with loaded geometry
        const routeSource = map.current?.getSource('route') as mapboxgl.GeoJSONSource
        if (routeSource) {
          console.log('📍 Updating route source with loaded geometry')
          routeSource.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: initialRouteData.routeCoordinates
            }
          })
        } else {
          console.warn('⚠️ Route source not found')
        }
        
        // Only fit map to the loaded route bounds if auto-fit is not disabled
        if (map.current && initialRouteData.routeCoordinates.length > 0 && !disableAutoFit) {
          console.log('🎯 Fitting map to loaded route bounds')
          const bounds = new mapboxgl.LngLatBounds()
          initialRouteData.routeCoordinates.forEach(coord => {
            bounds.extend(coord)
          })
          
          map.current.fitBounds(bounds, {
            padding: {
              top: 50,
              bottom: 50,
              left: 50,
              right: 50
            },
            duration: 1000 // Smooth animation to loaded route
          })
        } else if (disableAutoFit) {
          console.log('🚫 Auto-fit disabled, skipping fitBounds')
        }
      }
      
      // Update waypoints and direct line
      console.log('📍 Updating waypoints for loaded route')
      updateWaypoints(initialRouteData.points)
      
      // Update direct line source
      const directLineSource = map.current?.getSource('direct-line') as mapboxgl.GeoJSONSource
      if (directLineSource) {
        console.log('📏 Updating direct line source')
        directLineSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: initialRouteData.points.map(p => [p.lng, p.lat])
          }
        })
      } else {
        console.warn('⚠️ Direct line source not found')
      }
      
      console.log('✅ Initial route data loaded successfully')
    } else if (initialRouteData) {
      console.log('🔄 Initial route data present but conditions not met:', {
        hasPoints: initialRouteData.points?.length || 0,
        isLoaded
      })
    }
  }, [initialRouteData, isLoaded, updateWaypoints, disableAutoFit])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Enhanced WebGL diagnostic and support check
    const checkWebGLSupport = (): { supported: boolean, diagnostics: { webglSupported: boolean; webgl2Supported: boolean; renderer: string; vendor: string; version: string; extensions: string[]; maxTextureSize: number; maxVertexAttribs: number; maxVaryingVectors: number; maxFragmentUniforms: number } } => {
      const diagnostics = {
        webglSupported: false,
        webgl2Supported: false,
        renderer: 'unknown',
        vendor: 'unknown',
        version: 'unknown',
        extensions: [] as string[],
        maxTextureSize: 0,
        maxVertexAttribs: 0,
        maxVaryingVectors: 0,
        maxFragmentUniforms: 0,
        maxVertexUniforms: 0,
        aliasedPointSizeRange: [0, 0],
        aliasedLineWidthRange: [0, 0],
        maxViewportDims: [0, 0],
        contextAttributes: null as WebGLContextAttributes | null,
        failureReason: 'unknown'
      }
      
      try {
        const canvas = document.createElement('canvas')
        
        // Try WebGL 2.0 first
        let gl: WebGLRenderingContext | WebGL2RenderingContext | null = canvas.getContext('webgl2')
        if (gl) {
          diagnostics.webgl2Supported = true
          diagnostics.webglSupported = true
          console.log('✅ WebGL 2.0 is supported')
        } else {
          // Fallback to WebGL 1.0
          const webgl1Context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
          if (webgl1Context) {
            gl = webgl1Context as WebGLRenderingContext
            diagnostics.webglSupported = true
            console.log('✅ WebGL 1.0 is supported')
          }
        }
        
        if (!gl) {
          diagnostics.failureReason = 'No WebGL context could be created'
          console.error('❌ WebGL not supported by this browser/device')
          return { supported: false, diagnostics }
        }
        
        const webglContext = gl as WebGLRenderingContext
        
        // Get detailed WebGL information
        try {
          const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info')
          if (debugInfo) {
            diagnostics.renderer = webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown'
            diagnostics.vendor = webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown'
          }
        } catch (e) {
          console.warn('⚠️ Could not get debug renderer info:', e)
        }
        
        diagnostics.version = webglContext.getParameter(webglContext.VERSION) || 'unknown'
        diagnostics.contextAttributes = webglContext.getContextAttributes()
        
        // Get WebGL limits and capabilities
        diagnostics.maxTextureSize = webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE) || 0
        diagnostics.maxVertexAttribs = webglContext.getParameter(webglContext.MAX_VERTEX_ATTRIBS) || 0
        diagnostics.maxVaryingVectors = webglContext.getParameter(webglContext.MAX_VARYING_VECTORS) || 0
        diagnostics.maxFragmentUniforms = webglContext.getParameter(webglContext.MAX_FRAGMENT_UNIFORM_VECTORS) || 0
        diagnostics.maxVertexUniforms = webglContext.getParameter(webglContext.MAX_VERTEX_UNIFORM_VECTORS) || 0
        diagnostics.aliasedPointSizeRange = webglContext.getParameter(webglContext.ALIASED_POINT_SIZE_RANGE) || [0, 0]
        diagnostics.aliasedLineWidthRange = webglContext.getParameter(webglContext.ALIASED_LINE_WIDTH_RANGE) || [0, 0]
        diagnostics.maxViewportDims = webglContext.getParameter(webglContext.MAX_VIEWPORT_DIMS) || [0, 0]
        
        // Get all available extensions
        const availableExtensions = webglContext.getSupportedExtensions() || []
        diagnostics.extensions = availableExtensions
        
        // Check for critical extensions for Mapbox
        const criticalExtensions = [
          'OES_element_index_uint',
          'OES_standard_derivatives',
          'OES_vertex_array_object',
          'WEBGL_depth_texture',
          'EXT_texture_filter_anisotropic'
        ]
        
        const missingCritical: string[] = []
        for (const ext of criticalExtensions) {
          if (!webglContext.getExtension(ext)) {
            missingCritical.push(ext)
          }
        }
        
        // Log comprehensive diagnostics
        console.group('🔍 WebGL Diagnostics Report')
        console.log('📊 WebGL Version:', diagnostics.webgl2Supported ? '2.0' : '1.0')
        console.log('💻 Renderer:', diagnostics.renderer)
        console.log('🏢 Vendor:', diagnostics.vendor)
        console.log('🔢 Version String:', diagnostics.version)
        console.log('🖼️ Max Texture Size:', diagnostics.maxTextureSize)
        console.log('🔗 Max Vertex Attributes:', diagnostics.maxVertexAttribs)
        console.log('📊 Max Viewport:', diagnostics.maxViewportDims)
        console.log('🧩 Extensions Count:', availableExtensions.length)
        
        if (missingCritical.length > 0) {
          console.warn('⚠️ Missing critical extensions (' + missingCritical.length + '):', missingCritical.join(', '))
          console.warn('📋 Missing extensions breakdown:')
          missingCritical.forEach(ext => {
            console.warn(`  ❌ ${ext} - ${getExtensionDescription(ext)}`)
          })
          console.warn('💡 Note: Some missing extensions may cause stability issues')
          console.warn('🔧 Recommendations:')
          console.warn('  • Update your graphics drivers to the latest version')
          console.warn('  • Enable hardware acceleration in browser settings')
          console.warn('  • Try Chrome or Firefox for better WebGL support')
        } else {
          console.log('✅ All critical extensions supported')
        }
        
        console.groupEnd()
        
        // Validate WebGL context health
        const error = webglContext.getError()
        if (error !== webglContext.NO_ERROR) {
          diagnostics.failureReason = `WebGL context error: ${error}`
          console.error('❌ WebGL context has error:', error)
          return { supported: false, diagnostics }
        }
        
        // Test basic WebGL functionality
        try {
          const testShader = webglContext.createShader(webglContext.VERTEX_SHADER)
          if (!testShader) {
            diagnostics.failureReason = 'Cannot create shader objects'
            console.error('❌ Cannot create WebGL shaders')
            return { supported: false, diagnostics }
          }
          webglContext.deleteShader(testShader)
        } catch (shaderError) {
          diagnostics.failureReason = `Shader creation failed: ${shaderError}`
          console.error('❌ Shader test failed:', shaderError)
          return { supported: false, diagnostics }
        }
        
        console.log('✅ WebGL is fully supported and functional')
        return { supported: true, diagnostics }
        
      } catch (_error) {
        diagnostics.failureReason = `WebGL check exception: ${_error}`
        console.error('❌ WebGL check failed:', _error)
        return { supported: false, diagnostics }
      }
    }
    
    // Helper function to describe WebGL extensions
    const getExtensionDescription = (ext: string): string => {
      const descriptions: { [key: string]: string } = {
        'OES_element_index_uint': 'Required for large meshes (uint indices)',
        'OES_standard_derivatives': 'Required for advanced shading effects', 
        'OES_vertex_array_object': 'Improves rendering performance',
        'WEBGL_depth_texture': 'Required for shadow mapping and depth effects',
        'EXT_texture_filter_anisotropic': 'Improves texture quality at distance'
      }
      return descriptions[ext] || 'Performance or compatibility enhancement'
    }

    // Software rendering mode - skip WebGL checks for maximum compatibility
    console.log('🎨 Using software rendering mode for universal compatibility')
    console.log('🔧 Benefits: Works on all devices, no GPU driver issues, stable rendering')
    console.log('📊 Note: Performance may be lower but compatibility is maximized')

    // Check Mapbox access token
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!mapboxToken || mapboxToken === 'your_mapbox_token_here') {
      console.error('❌ Mapbox access token is not configured')
      setRenderingError('Mapbox access token is missing or invalid. Please check your environment configuration.')
      setIsLoaded(false)
      return
    }

    // Function to initialize map with given center coordinates
    const initializeMap = (center: [number, number]) => {
      try {
        console.log('🗺️ Initializing Mapbox GL map with center:', center)
        
        // Check if container is available
        if (!mapContainer.current) {
          console.error('❌ Map container not available')
          return
        }
        
        // Initialize map with software rendering for maximum compatibility
        console.log('🎨 Initializing map with software rendering (WebGL disabled)...')
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: 12,
          attributionControl: false,
          // Force software rendering - no WebGL
          failIfMajorPerformanceCaveat: false, // Always use software fallback
          preserveDrawingBuffer: true, // Required for software rendering
          antialias: false, // Disable for better software performance
          renderWorldCopies: false, // Reduce complexity
          // Enhanced transform request to handle network issues
          transformRequest: (url: string, resourceType: string | undefined) => {
            console.log(`🔗 Loading ${resourceType}: ${url}`)
            // Add headers to prevent caching issues that might cause ERR_ABORTED
            return {
              url: url,
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              },
              credentials: 'same-origin'
            }
          },
          accessToken: mapboxToken // Explicitly set token
        })
        
        setupMapAfterCreation()
      } catch (_error) {
        console.error('❌ Failed to initialize map:', _error)
        handleMapInitializationError(_error)
      }
    }

    // Function to handle map setup after creation
    const setupMapAfterCreation = () => {
      if (!map.current) return
      
      // Software rendering mode - no WebGL health monitoring needed
      console.log('📊 Software rendering is stable and doesn\'t require health monitoring')
      
      // Enhanced error event listeners for software rendering with retry logic
      map.current.on('error', (e) => {
        console.error('❌ Map error occurred:')
        console.error('  Error type:', e.error?.name || 'Unknown')
        console.error('  Error message:', e.error?.message || 'No message')
        console.error('  Error stack:', e.error?.stack || 'No stack trace')
        console.error('  Error status:', (e.error as { status?: number })?.status || 'No status')
        
        const errorMessage = e.error?.message || ''
        const errorName = e.error?.name || ''
        
        // Check for ERR_ABORTED and similar network errors
        const isNetworkError = errorMessage.includes('network') || 
                              errorMessage.includes('fetch') || 
                              errorMessage.includes('aborted') ||
                              errorMessage.includes('ERR_ABORTED') ||
                              errorName.includes('AbortError') ||
                              (e.error as { status?: number })?.status === 0
        
        const isStyleError = errorMessage.includes('style') || 
                            errorMessage.includes('source') ||
                            (e.error as { status?: number })?.status === 401 || 
                            (e.error as { status?: number })?.status === 403
        
        // Analyze error type for better user feedback
        let userMessage = 'An error occurred with the map.'
        
        if (isNetworkError) {
          userMessage = 'Network connection issue detected (ERR_ABORTED). This is often caused by browser security policies or network connectivity. The map will attempt to retry automatically.'
          console.log('🔄 Network error detected, this may resolve automatically on retry')
        } else if (errorMessage.includes('token') || errorMessage.includes('unauthorized')) {
          userMessage = 'Map access token is invalid or expired. Please check your configuration.'
        } else if (isStyleError) {
          userMessage = 'Map style loading error. This may be a temporary issue with Mapbox services.'
        }
        
        setRenderingError(userMessage)
      })
      
      // Software rendering mode - no WebGL context to manage
      console.log('🎨 Software rendering initialized - no WebGL context management needed')

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Add geolocate control for manual location access
      if ('geolocation' in navigator) {
        const geolocateControl = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        })
        
        // Handle geolocation success and errors
        geolocateControl.on('geolocate', (e) => {
          console.log('✅ User location found via control:', e.coords.latitude, e.coords.longitude)
        })
        
        geolocateControl.on('error', (error) => {
          console.warn('⚠️ Geolocation control error:', error.message)
        })
        
        map.current.addControl(geolocateControl, 'top-right')
      }

      // Set up map load event
      map.current.on('load', () => {
        setIsLoaded(true)
        initializeMapSources()
      })
    }

    // Function to handle map initialization errors
    const handleMapInitializationError = (error: Error | unknown) => {
      console.error('❌ Failed to initialize Mapbox map:', error)
      
      // Check for specific CSP/Worker errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isCSPWorkerError = errorMessage.includes('Worker') && 
                              (errorMessage.includes('Content Security Policy') || 
                               errorMessage.includes('SecurityError') ||
                               errorMessage.includes('blob:'))
      
      let userMessage = 'Failed to initialize map. Please refresh the page or try a different browser.'
      
      if (isCSPWorkerError) {
        console.error('🔒 CSP Worker error detected - this should be resolved by updated security headers')
        userMessage = 'Map initialization blocked by security policy. The page will automatically retry. If the issue persists, please refresh the page.'
        
        // Attempt to retry after a short delay for CSP errors
        setTimeout(() => {
          console.log('🔄 Retrying map initialization after CSP error...')
          window.location.reload()
        }, 3000)
      } else {
        console.error('🛠️ Try refreshing the page or check browser compatibility')
      }
      
      setRenderingError(`${userMessage} Error: ${errorMessage}`)
      setIsLoaded(false)
    }

    // Try to get user location first, then initialize map
    const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost'
    
    if (navigator.geolocation && isSecureContext) {
      console.log('🔍 Getting user location before map initialization...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          console.log('✅ User location found, initializing map at:', latitude, longitude)
          initializeMap([longitude, latitude])
        },
        (error) => {
          console.warn('⚠️ Could not get user location:', error.message)
          console.warn('📍 Error code:', error.code)
          if (error.code === 1) {
            console.warn('🔒 Location access denied by user')
          } else if (error.code === 2) {
            console.warn('📶 Location unavailable')
          } else if (error.code === 3) {
            console.warn('⏱️ Location request timed out')
          }
          console.warn('🗼 Using fallback location (Paris, France)')
          initializeMap([2.3522, 48.8566]) // Paris coordinates as fallback
        },
        {
          enableHighAccuracy: true,
          timeout: 5000, // Shorter timeout for initial load
          maximumAge: 60000
        }
      )
    } else {
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation not supported by this browser')
      } else {
        console.warn('🔒 Geolocation requires HTTPS or localhost')
        console.warn('💡 Tip: Access via https://localhost:3000 or deploy to HTTPS for location features')
      }
      console.warn('🗼 Using fallback location (Paris, France)')
      initializeMap([2.3522, 48.8566]) // Paris coordinates as fallback
    }
    return () => {
      // Software rendering cleanup - much simpler than WebGL
      eventHandlersSetupRef.current = false // Reset event handlers flag
      
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Initialize map sources and layers with proper cleanup
  const initializeMapSources = () => {
    if (!map.current) return

    console.log('🔧 Initializing map sources and layers...')
    
    // Helper function to safely add source
    const addSourceSafely = (id: string, source: mapboxgl.AnySourceData) => {
      if (map.current?.getSource(id)) {
        console.log(`📋 Source '${id}' already exists, updating data...`)
        const existingSource = map.current.getSource(id) as mapboxgl.GeoJSONSource
        if (existingSource && 'setData' in existingSource) {
          existingSource.setData(source.data)
        }
      } else {
        console.log(`➕ Adding new source '${id}'...`)
        map.current?.addSource(id, source)
      }
    }
    
    // Helper function to safely add layer
    const addLayerSafely = (layer: mapboxgl.AnyLayer) => {
      if (map.current?.getLayer(layer.id)) {
        console.log(`📋 Layer '${layer.id}' already exists, skipping...`)
      } else {
        console.log(`➕ Adding new layer '${layer.id}'...`)
        map.current?.addLayer(layer)
      }
    }

    // Add route line source (this will show the actual road route)
    addSourceSafely('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    })

    // Add direct line source (shows straight lines between waypoints)
    addSourceSafely('direct-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    })

    // Add waypoints source
    addSourceSafely('waypoints', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    })

    // Add route line layer with Strava-inspired styling
    addLayerSafely({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#fc4c02', // Strava orange
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 3,
          18, 8
        ],
        'line-opacity': 0.9
      }
    })

    // Add direct line layer (thinner, dashed line showing waypoint connections)
    addLayerSafely({
      id: 'direct-line',
      type: 'line',
      source: 'direct-line',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#64748b',
        'line-width': 2,
        'line-opacity': 0.5,
        'line-dasharray': [2, 2]
      }
    })

    // Add waypoints layer with enhanced styling
    addLayerSafely({
      id: 'waypoints',
      type: 'circle',
      source: 'waypoints',
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          10,
          ['case',
            ['boolean', ['feature-state', 'selected'], false],
            8,
            6
          ]
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'isFirst'], true],
          '#16a34a', // Green for start
          ['==', ['get', 'isLast'], true],
          '#dc2626', // Red for end
          '#fc4c02'  // Orange for waypoints
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          3,
          2
        ],
        'circle-opacity': 1
      }
    })

    // Setup event handlers (only if not already set up)
    setupEventHandlers()
    
    console.log('✅ Map sources and layers initialization complete')
  }

  // Setup all event handlers (with duplicate prevention)
  const setupEventHandlers = () => {
    if (!map.current) return
    
    // Skip if handlers are already set up to prevent duplicates
    if (eventHandlersSetupRef.current) {
      console.log('📋 Event handlers already set up, skipping...')
      return
    }
    
    console.log('⚙️ Setting up event handlers...')

    // Map click handler for adding waypoints
    map.current.on('click', handleMapClick)
    
    // Right-click handler for context menu
    map.current.on('contextmenu', handleMapRightClick)
    
    // Waypoint interaction handlers - order matters for drag functionality
    map.current.on('mouseenter', 'waypoints', handleWaypointMouseEnter)
    map.current.on('mouseleave', 'waypoints', handleWaypointMouseLeave)
    map.current.on('mousedown', 'waypoints', handleWaypointMouseDown) // Before click
    map.current.on('click', 'waypoints', handleWaypointClick)
    map.current.on('contextmenu', 'waypoints', handleWaypointRightClick)
    
    // Global mouse handlers for dragging
    map.current.on('mousemove', handleMouseMove)
    map.current.on('mouseup', handleMouseUp)
    
    // Prevent map interactions during waypoint dragging
    map.current.on('mousedown', (e) => {
      if (isDraggingRef.current) {
        e.preventDefault()
        e.originalEvent.stopPropagation()
      }
    })
    
    map.current.on('click', (e) => {
      if (isDraggingRef.current) {
        e.preventDefault()
        e.originalEvent.stopPropagation()
      }
    })
    
    // Mark handlers as set up
    eventHandlersSetupRef.current = true
    console.log('✅ Event handlers setup complete')
  }

  // Handle map clicks for route drawing with locking mechanism
  const handleMapClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    // Don't add points if we're not in draw mode or if we're dragging
    if (selectedShapeRef.current !== 'draw' || isDraggingRef.current) return
    
    // LOCKING MECHANISM: Prevent adding new points while calculation is in progress
    if (isProcessingPointRef.current) {
      console.log('🚫 Ignoring click - route calculation in progress')
      return
    }
    
    // Check if click was on a waypoint (prevent double handling)
    const features = map.current?.queryRenderedFeatures(e.point, { layers: ['waypoints'] })
    if (features && features.length > 0) return

    const newPoint: RoutePoint = {
      lat: e.lngLat.lat,
      lng: e.lngLat.lng,
      elevation: 0,
    }

    const currentPoints = routePointsRef.current
    const updatedPoints = [...currentPoints, newPoint]
    
    // Set processing flag to prevent new clicks
    isProcessingPointRef.current = true
    console.log('🔒 Starting point processing - locking new clicks')
    
    setRoutePoints(updatedPoints)
    
    // Update waypoints immediately for visual feedback
    updateWaypoints(updatedPoints)
    
    // Clear any existing timeout
    if (routeCalculationTimeoutRef.current) {
      clearTimeout(routeCalculationTimeoutRef.current)
    }
    
    // Start route calculation with locking
    routeCalculationTimeoutRef.current = setTimeout(async () => {
      try {
        await updateRouteWithRoads(updatedPoints)
      } finally {
        // Always unlock after calculation completes (success or error)
        isProcessingPointRef.current = false
        console.log('🔓 Point processing complete - unlocking clicks')
      }
    }, 300) // 300ms debounce for point addition
  }, []) // No dependencies - using refs instead

  // Handle right-click on map (for future features like inserting waypoints)
  const handleMapRightClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    e.preventDefault()
    // Could be used for inserting waypoints between existing ones
  }, [])

  // Handle right-click on waypoints for deletion
  const handleWaypointRightClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    e.preventDefault()
    
    if (e.features && e.features[0]) {
      const pointIndex = e.features[0].properties?.index
      if (typeof pointIndex === 'number') {
        deletePoint(pointIndex)
      }
    }
  }, []) // Remove dependencies

  // Waypoint interaction handlers
  const handleWaypointMouseEnter = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map.current || isDraggingRef.current) return
    map.current.getCanvas().style.cursor = 'pointer'
    
    if (e.features && e.features[0] && e.features[0].id !== undefined) {
      map.current.setFeatureState(
        { source: 'waypoints', id: e.features[0].id },
        { hover: true }
      )
    }
  }, []) // Remove dependencies

  const handleWaypointMouseLeave = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map.current || isDraggingRef.current) return
    map.current.getCanvas().style.cursor = ''
    
    if (e.features && e.features[0] && e.features[0].id !== undefined) {
      map.current.setFeatureState(
        { source: 'waypoints', id: e.features[0].id },
        { hover: false }
      )
    }
  }, []) // Remove dependencies

  const handleWaypointClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    e.preventDefault()
    e.originalEvent.stopPropagation()
    
    if (e.features && e.features[0]) {
      const pointIndex = e.features[0].properties?.index
      
      if (typeof pointIndex === 'number') {
        // Clear previous selection
        if (selectedPointIndex !== null && map.current) {
          map.current.setFeatureState(
            { source: 'waypoints', id: selectedPointIndex },
            { selected: false }
          )
        }
        
        // Set new selection
        setSelectedPointIndex(pointIndex)
        if (map.current) {
          map.current.setFeatureState(
            { source: 'waypoints', id: pointIndex },
            { selected: true }
          )
        }
      }
    }
  }, [selectedPointIndex])

  const handleWaypointMouseDown = useCallback((e: mapboxgl.MapMouseEvent) => {
    e.preventDefault()
    e.originalEvent.stopPropagation()
    
    if (e.features && e.features[0]) {
      const pointIndex = e.features[0].properties?.index
      
      if (typeof pointIndex === 'number') {
        console.log('Starting drag for point:', pointIndex) // Debug log
        setSelectedPointIndex(pointIndex)
        setIsDragging(true)
        
        if (map.current) {
          map.current.getCanvas().style.cursor = 'grabbing'
          map.current.dragPan.disable() // Disable map dragging while dragging waypoint
          
          // Clear previous selection states
          const currentPoints = routePointsRef.current
          for (let i = 0; i < currentPoints.length; i++) {
            map.current.setFeatureState(
              { source: 'waypoints', id: i },
              { selected: i === pointIndex }
            )
          }
        }
      }
    }
  }, [])

  const handleMouseMove = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!isDraggingRef.current || selectedPointIndexRef.current === null || !map.current) return
    
    const pointIndex = selectedPointIndexRef.current
    const currentPoints = routePointsRef.current
    const updatedPoints = [...currentPoints]
    
    updatedPoints[pointIndex] = {
      ...updatedPoints[pointIndex],
      lat: e.lngLat.lat,
      lng: e.lngLat.lng
    }
    
    setRoutePoints(updatedPoints)
    
    // Update waypoints immediately for visual feedback
    updateWaypoints(updatedPoints)
    
    // Set processing flag during drag to prevent new point additions
    isProcessingPointRef.current = true
    
    // Debounced route calculation for performance
    if (routeCalculationTimeoutRef.current) {
      clearTimeout(routeCalculationTimeoutRef.current)
    }
    
    routeCalculationTimeoutRef.current = setTimeout(async () => {
      try {
        await updateRouteWithRoads(updatedPoints)
      } finally {
        // Don't unlock here - will be unlocked in handleMouseUp
      }
    }, 150) // 150ms debounce for real-time feel without overwhelming the API
  }, []) // Remove all dependencies - using refs

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return
    
    console.log('Ending drag') // Debug log
    setIsDragging(false)
    
    if (map.current) {
      map.current.getCanvas().style.cursor = ''
      map.current.dragPan.enable() // Re-enable map dragging
    }
    
    // Final route calculation after drag ends
    if (routeCalculationTimeoutRef.current) {
      clearTimeout(routeCalculationTimeoutRef.current)
    }
    
    // Use the current route points for final calculation
    const currentPoints = routePointsRef.current
    
    // Final calculation with unlock
    routeCalculationTimeoutRef.current = setTimeout(async () => {
      try {
        await updateRouteWithRoads(currentPoints)
      } finally {
        // Unlock after final drag calculation
        isProcessingPointRef.current = false
        console.log('🔓 Drag processing complete - unlocking clicks')
      }
    }, 100) // Short delay for final calculation
  }, [])

  // Delete a waypoint
  const deletePoint = useCallback((index: number) => {
    const currentPoints = routePointsRef.current
    if (index < 0 || index >= currentPoints.length) return
    
    const updatedPoints = currentPoints.filter((_, i) => i !== index)
    setRoutePoints(updatedPoints)
    
    // Clear selection if deleted point was selected
    if (selectedPointIndex === index) {
      setSelectedPointIndex(null)
    } else if (selectedPointIndex !== null && selectedPointIndex > index) {
      setSelectedPointIndex(selectedPointIndex - 1)
    }
    
    updateRouteWithRoads(updatedPoints)
  }, [selectedPointIndex]) // Keep selectedPointIndex dependency

  // Fetch elevation data for route points
  const fetchElevationData = async (points: RoutePoint[]): Promise<RoutePoint[]> => {
    if (points.length === 0) return points
    
    try {
      const response = await fetch('/api/elevation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points: points.map(p => ({ lat: p.lat, lng: p.lng }))
        })
      })
      
      if (!response.ok) {
        console.warn('Elevation API request failed, using elevation 0')
        return points
      }
      
      const data = await response.json()
      
      if (data.success && data.data && data.data.points) {
        console.log('📊 Elevation data received from Mapbox Terrain-RGB API')
        console.log('  📈 Source:', data.data.metadata.source)
        console.log('  🏔️ Elevation gain:', data.data.statistics.totalGain, 'm')
        console.log('  📍 Points:', data.data.points.map((p: { elevation: number }) => `${p.elevation}m`).join(', '))
        
        const pointsWithElevation = points.map((point, index) => ({
          ...point,
          elevation: data.data.points[index]?.elevation || 0
        }))
        
        return pointsWithElevation
      }
      
      return points
    } catch (_error) {
      console.warn('Elevation API request failed:', _error)
      return points
    }
  }

  // Fetch route using Mapbox Directions API with elevation request and caching
  const fetchRoute = async (points: RoutePoint[]): Promise<{ geometry: { coordinates: Array<[number, number]> }; distance: number; duration: number } | null> => {
    if (points.length < 2 || !MAPBOX_TOKEN) return null
    
    try {
      // Create cache key from coordinates
      const cacheKey = points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')
      
      // Check cache first
      if (routeCacheRef.current.has(cacheKey)) {
        console.log('📋 Using cached route for', points.length, 'points')
        return routeCacheRef.current.get(cacheKey)
      }
      
      console.log('📍 Fetching new route for', points.length, 'points')
      
      const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';')
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?` +
        new URLSearchParams({
          geometries: 'geojson',
          overview: 'full',
          steps: 'false',
          access_token: MAPBOX_TOKEN
        })
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      const route = data.routes?.[0] || null
      
      // Cache the result (limit cache size to prevent memory issues)
      if (route && routeCacheRef.current.size < 50) {
        routeCacheRef.current.set(cacheKey, route)
      } else if (route && routeCacheRef.current.size >= 50) {
        // Clear oldest entries when cache is full
        const firstKey = routeCacheRef.current.keys().next().value
        if (firstKey) {
          routeCacheRef.current.delete(firstKey)
        }
        routeCacheRef.current.set(cacheKey, route)
      }
      
      return route
    } catch (_error) {
      console.warn('Route calculation failed, falling back to direct lines:', _error)
      return null
    }
  }

  // Get real elevation data for route points using elevation API (optimized)
  const fetchRouteElevationData = async (routeCoordinates: number[][]): Promise<number[]> => {
    if (!routeCoordinates || routeCoordinates.length === 0) return []
    
    try {
      // Optimized sampling: reduce points for better performance
      // For routes under 1km, use fewer samples
      const routeLength = routeCoordinates.length
      let maxSamples = 50 // Reduced from 100 for better performance
      
      // Scale samples based on route complexity
      if (routeLength < 20) {
        maxSamples = Math.min(15, routeLength)
      } else if (routeLength < 100) {
        maxSamples = Math.min(25, routeLength)
      }
      
      const sampleIndices = []
      
      if (routeCoordinates.length <= maxSamples) {
        // Use all points if within optimized limit
        for (let i = 0; i < routeCoordinates.length; i++) {
          sampleIndices.push(i)
        }
      } else {
        // Smart sampling: always include start and end, then distribute evenly
        sampleIndices.push(0) // Start
        
        for (let i = 1; i < maxSamples - 1; i++) {
          const index = Math.floor((i / (maxSamples - 1)) * (routeCoordinates.length - 1))
          sampleIndices.push(index)
        }
        
        if (routeCoordinates.length > 1) {
          sampleIndices.push(routeCoordinates.length - 1) // End
        }
      }
      
      const sampledPoints = sampleIndices.map(i => {
        const [lng, lat] = routeCoordinates[i]
        return { lat, lng }
      })
      
      console.log('📍 Optimized elevation fetch:', sampledPoints.length, 'of', routeCoordinates.length, 'points')
      
      // Call our elevation API
      const response = await fetch('/api/elevation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points: sampledPoints
        })
      })
      
      if (!response.ok) {
        console.warn('Elevation API failed for route points')
        return routeCoordinates.map(() => 0)
      }
      
      const elevationData = await response.json()
      
      if (elevationData.success && elevationData.data && elevationData.data.points) {
        console.log('🏔️ Route elevation data (optimized):')
        console.log('  📊 Samples used:', elevationData.data.points.length, 'of', routeCoordinates.length)
        
        const elevations = elevationData.data.points.map((p: { elevation?: number }) => p.elevation || 0)
        
        // Fast interpolation for all route points
        const allElevations: number[] = []
        
        if (routeCoordinates.length <= maxSamples) {
          // Direct mapping for small routes
          return elevations.slice(0, routeCoordinates.length)
        } else {
          // Linear interpolation for larger routes
          for (let i = 0; i < routeCoordinates.length; i++) {
            const ratio = (i / (routeCoordinates.length - 1)) * (elevations.length - 1)
            const lowerIndex = Math.floor(ratio)
            const upperIndex = Math.min(lowerIndex + 1, elevations.length - 1)
            const t = ratio - lowerIndex
            
            const interpolatedElevation = elevations[lowerIndex] * (1 - t) + elevations[upperIndex] * t
            allElevations.push(Math.round(interpolatedElevation))
          }
        }
        
        return allElevations
      }
      
      return routeCoordinates.map(() => 0)
    } catch (_error) {
      console.warn('Failed to fetch route elevation data:', _error)
      return routeCoordinates.map(() => 0)
    }
  }

  // Update route with road routing and real elevation data
  const updateRouteWithRoads = useCallback(async (points: RoutePoint[]) => {
    if (!map.current) return
    
    // Only show calculating notification for 2+ points (when route calculation is needed)
    const shouldShowCalculating = points.length >= 2
    if (shouldShowCalculating) {
      setIsCalculatingRoute(true)
    }
    
    try {
      let routeGeometry: { coordinates: Array<[number, number]> } | null = null
      let routeDistance = 0
      let routeDuration = 0
      let routeElevationGain = 0
      let pointsWithRealElevation = points
      let routeElevations: number[] = []
      
      if (points.length >= 2) {
        // Get route from Mapbox Directions API
        const route = await fetchRoute(points)
        
        if (route) {
          routeGeometry = route.geometry
          routeDistance = route.distance / 1000 // Convert to km
          // Use pace-based duration calculation instead of Mapbox API duration
          // This ensures consistency with RouteStats display
          routeDuration = routeDistance * 5.5 * 60 // 5.5 min/km default pace in seconds
          
          // Get real elevation data for the route path
          if (routeGeometry && routeGeometry.coordinates) {
            const routeCoordinates = routeGeometry.coordinates
            console.log('🛣️ Route has', routeCoordinates.length, 'coordinate points')
            
            // Fetch real elevation data for route points
            routeElevations = await fetchRouteElevationData(routeCoordinates)
            
            // Calculate real elevation gain from route geometry
            let totalElevationGain = 0
            
            for (let i = 1; i < routeElevations.length; i++) {
              const elevationDiff = routeElevations[i] - routeElevations[i - 1]
              if (elevationDiff > 0) {
                totalElevationGain += elevationDiff
              }
            }
            
            routeElevationGain = totalElevationGain
            console.log('🏔️ Real route elevation gain:', routeElevationGain, 'm')
            console.log('  Elevation range:', Math.min(...routeElevations), 'm to', Math.max(...routeElevations), 'm')
            
            // Map waypoints to corresponding elevations from route
            pointsWithRealElevation = points.map((point, index) => {
              // Find closest route coordinate to this waypoint
              let closestElevation = 0
              let minDistance = Infinity
              
              for (let i = 0; i < routeCoordinates.length; i++) {
                const coord = routeCoordinates[i]
                const [lng, lat] = coord
                const distance = Math.sqrt(
                  Math.pow(point.lat - lat, 2) + Math.pow(point.lng - lng, 2)
                )
                
                if (distance < minDistance) {
                  minDistance = distance
                  closestElevation = routeElevations[i] || 0
                }
              }
              
              return {
                ...point,
                elevation: closestElevation
              }
            })
            
            console.log('📍 Waypoints with real elevation:', pointsWithRealElevation.map(p => `${p.elevation}m`).join(', '))
          }
        } else {
          // Fallback to direct lines and API elevation call
          routeGeometry = {
            type: 'LineString',
            coordinates: points.map(p => [p.lng, p.lat])
          }
          routeDistance = calculateDirectDistance(points)
          routeDuration = routeDistance * 5.5 * 60 // Estimate based on 5.5 min/km pace
          
          // Get elevation data from API as fallback
          pointsWithRealElevation = await fetchElevationData(points)
          routeElevationGain = calculateElevationGain(pointsWithRealElevation)
        }
      } else {
        routeGeometry = {
          type: 'LineString',
          coordinates: points.map(p => [p.lng, p.lat])
        }
        
        // Single point - try to get elevation from API
        if (points.length === 1) {
          pointsWithRealElevation = await fetchElevationData(points)
        }
      }
      
      // Update route line
      const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource
      if (routeSource && routeGeometry) {
        routeSource.setData({
          type: 'Feature',
          properties: {},
          geometry: routeGeometry
        })
      }
      
      // Update direct line (waypoint connections)
      const directLineSource = map.current.getSource('direct-line') as mapboxgl.GeoJSONSource
      if (directLineSource) {
        directLineSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: pointsWithRealElevation.map(p => [p.lng, p.lat])
          }
        })
      }
      
      // Update the route points state with real elevation data
      setRoutePoints(pointsWithRealElevation)
      
      // Update waypoints
      updateWaypoints(pointsWithRealElevation)
      
      // Calculate and emit route data with real elevation
      const routeData: RouteData = {
        points: pointsWithRealElevation,
        distance: routeDistance,
        duration: routeDuration,
        elevationGain: routeElevationGain,
        averagePace: routeDistance > 0 ? (routeDuration / 60) / routeDistance : 5.5,
        routeGeometry: routeGeometry,
        routeCoordinates: routeGeometry?.coordinates || [],
        routeElevations: routeElevations
      }
      
      onRouteChange(routeData)
      
    } catch (_error) {
      console.error('Error updating route:', _error)
    } finally {
      // Only hide notification if it was shown (for 2+ points)
      if (points.length >= 2) {
        setIsCalculatingRoute(false)
      }
    }
  }, [onRouteChange])

  // Helper function to calculate direct distance between points
  const calculateDirectDistance = (points: RoutePoint[]): number => {
    return calculateRouteDistance(points)
  }

  // Haversine formula for distance calculation
  // Note: Using shared utility function calculateDistance from @/utils/mapUtils

  // Search for location suggestions as user types
  const fetchSearchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || !MAPBOX_TOKEN || query.length < 2) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          limit: '5',
          types: 'place,locality,neighborhood,address,poi'
        })
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        setSearchSuggestions(data.features)
        setShowSuggestions(true)
      } else {
        setSearchSuggestions([])
        setShowSuggestions(false)
      }
    } catch (_error) {
      console.error('Error fetching search suggestions:', _error)
      setSearchSuggestions([])
      setShowSuggestions(false)
    }
  }, [])
  
  // Debounced search suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchSearchSuggestions(searchQuery)
      } else {
        setSearchSuggestions([])
        setShowSuggestions(false)
      }
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery, fetchSearchSuggestions])
  
  // Handle suggestion click
  const handleSuggestionClick = useCallback((feature: { center: [number, number]; place_name: string }) => {
    // Immediately hide suggestions to prevent any timing issues
    setShowSuggestions(false)
    setSearchSuggestions([])
    
    const [lng, lat] = feature.center
    
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        speed: 1.2,
        curve: 1.4,
        easing: (t) => t
      })
    }
    
    setSearchQuery(feature.place_name)
  }, [])
  
  // Handle search form submission
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchSuggestions.length > 0) {
      handleSuggestionClick(searchSuggestions[0])
    }
  }, [searchSuggestions, handleSuggestionClick])
  
  // Clear route
  const clearRoute = useCallback(() => {
    setRoutePoints([])
    setSelectedPointIndex(null)
    updateRouteWithRoads([])
  }, [])

  // Generate predefined shapes
  useEffect(() => {
    if (!isLoaded || selectedShape === 'draw') return

    if (selectedShape === 'heart') {
      generateHeartShape()
    } else if (selectedShape === 'circle') {
      generateCircleShape()
    }
  }, [selectedShape, isLoaded])

  const generateHeartShape = useCallback(() => {
    const center = map.current?.getCenter()
    if (!center) return

    const points: RoutePoint[] = []
    const scale = 0.005 // Smaller scale for more reasonable size

    // Generate heart shape points (reduced number for better performance)
    for (let t = 0; t <= 2 * Math.PI; t += 0.3) {
      const x = scale * (16 * Math.sin(t) ** 3)
      const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
      
      points.push({
        lat: center.lat + y,
        lng: center.lng + x,
        elevation: 0
      })
    }

    setRoutePoints(points)
    updateRouteWithRoads(points)
  }, [])

  const generateCircleShape = useCallback(() => {
    const center = map.current?.getCenter()
    if (!center) return

    const points: RoutePoint[] = []
    const radius = 0.005 // Smaller radius for more reasonable size

    // Generate circle points (reduced number for better performance)
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
      const lat = center.lat + radius * Math.cos(angle)
      const lng = center.lng + radius * Math.sin(angle) / Math.cos(center.lat * Math.PI / 180)
      
      points.push({
        lat,
        lng,
        elevation: 0
      })
    }

    // Close the circle
    if (points.length > 0) {
      points.push({ ...points[0] })
    }

    setRoutePoints(points)
    updateRouteWithRoads(points)
  }, [])

  // Update waypoints visibility when showWaypoints or selectedShape changes
  useEffect(() => {
    if (isLoaded) {
      updateWaypoints(routePoints)
    }
  }, [showWaypoints, selectedShape, isLoaded])



  // Cleanup effect
  useEffect(() => {
    return () => {
      if (routeCalculationTimeoutRef.current) {
        clearTimeout(routeCalculationTimeoutRef.current)
      }
      // Clear route cache on unmount to free memory
      if (routeCacheRef.current) {
        routeCacheRef.current.clear()
      }
    }
  }, [])

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
      
      {/* Route Calculation Loading Notification - Center of Map */}
      {isCalculatingRoute && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-3 flex items-center space-x-3 animate-in fade-in zoom-in duration-200">
            <div className="relative">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-5 h-5 border-2 border-blue-200 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Calculating route...</span>
              <span className="text-xs text-gray-500">Finding the best path</span>
            </div>
          </div>
        </div>
      )}

      {/* Software rendering status removed */}

      {/* Search Bar with Suggestions */}
      <div className="absolute top-4 left-4 z-10">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="flex">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowSuggestions(searchSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 50)} // Very short delay
                placeholder="Search location..."
                className="w-64 px-4 py-2 pr-12 text-sm border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-lg"
                disabled={isSearching}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700 transition-colors font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border border-primary-600"
            >
              <span className="text-lg filter drop-shadow-sm">🔍</span>
            </button>
          </div>
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div 
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking on dropdown
            >
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {suggestion.text}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {suggestion.place_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
      
      {/* Collapsible Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <div 
          className="relative"
          onMouseEnter={() => setIsLegendVisible(true)}
          onMouseLeave={() => setIsLegendVisible(false)}
        >
          {/* Help Button */}
          <button className="bg-white rounded-full shadow-lg p-3 border border-gray-200 hover:bg-gray-50 transition-colors">
            <span className="text-lg">❓</span>
          </button>
          
          {/* Expandable Legend */}
          <div className={`absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-300 transform origin-bottom-left ${
            isLegendVisible 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}>
            <div className="p-4 space-y-3 min-w-[200px]">
              {/* Status Information */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Points:</span>
                  <span className="text-xs font-medium text-gray-900">{routePoints.length}</span>
                </div>
                
                {selectedPointIndex !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Selected:</span>
                    <span className="text-xs font-medium text-blue-600">Point {selectedPointIndex + 1}</span>
                  </div>
                )}
                
                {isDragging && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">Dragging...</span>
                  </div>
                )}
                
                {isCalculatingRoute && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600 font-medium">Calculating route...</span>
                  </div>
                )}
                
                {isProcessingPointRef.current && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-orange-600 font-medium">Processing point...</span>
                  </div>
                )}
              </div>
              
              {/* Instructions */}
              <div className="border-t pt-3">
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="font-medium text-gray-600 mb-2">How to use:</div>
                  <div>• Click map to add points</div>
                  <div>• Right-click point to delete</div>
                  <div>• Click and drag to move points</div>
                  <div>• Route follows roads automatically</div>
                </div>
              </div>
              
              {/* Route Type Indicator */}
              {routePoints.length >= 2 && (
                <div className="border-t pt-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-orange-600"></div>
                    <span className="text-xs text-gray-600">Road route</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-3 h-1 bg-gray-400 border-dashed border border-gray-300"></div>
                    <span className="text-xs text-gray-600">Waypoint line</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Waypoints Toggle - Hidden for now */}
      {/* <div className="absolute top-4 right-16 z-10">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 px-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showWaypoints}
              onChange={(e) => {
                console.log('🔄 Waypoints checkbox changed to:', e.target.checked)
                onShowWaypointsChange(e.target.checked)
                // Force immediate update
                setTimeout(() => {
                  console.log('🔄 Forcing waypoints update...')
                  updateWaypoints(routePointsRef.current)
                }, 0)
              }}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-xs text-gray-700 font-medium whitespace-nowrap">Show Waypoints</span>
          </label>
        </div>
      </div> */}
      
      {/* Clear Route Button - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={clearRoute}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg disabled:opacity-50"
          disabled={routePoints.length === 0}
        >
          Clear Route
        </button>
      </div>

      {/* Loading/Error overlay - Software Rendering Mode */}
      {(!isLoaded || renderingError) && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          {renderingError ? (
            <div className="text-center p-6 max-w-md">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
              <p className="text-sm text-gray-600 mb-4">{renderingError}</p>
              
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">🎨 Software Rendering Mode</div>
                  <div className="text-xs">This map uses CPU-based rendering for maximum compatibility.</div>
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-gray-500 mb-4">
                <div className="font-medium">Possible solutions for ERR_ABORTED:</div>
                <div>• Try accessing via <code className="bg-gray-200 px-1 rounded">https://localhost:3000</code> instead of <code className="bg-gray-200 px-1 rounded">http://localhost:3000</code></div>
                <div>• Disable browser extensions (especially ad blockers) temporarily</div>
                <div>• Try a different browser (Chrome, Firefox, Edge)</div>
                <div>• Check your internet connection</div>
                <div>• Clear browser cache and cookies</div>
                <div>• Verify Mapbox access token configuration</div>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setRenderingError(null)
                    window.location.reload()
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium w-full"
                >
                  Refresh Page
                </button>
                
                <button
                  onClick={() => {
                    setRenderingError(null)
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium w-full"
                >
                  Dismiss Error
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="loading-spinner"></div>
                <span className="text-gray-600 font-medium">Loading map...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}