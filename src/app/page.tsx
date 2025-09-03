'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSavedRoutesStore } from '@/store/savedRoutesStore'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'
import RouteStats from '@/components/RouteStats'
import InteractiveDataVisualization from '@/components/InteractiveDataVisualization'
import RunDetails from '@/components/RunDetails'
import SaveRouteModal from '@/components/SaveRouteModal'
import Toast from '@/components/Toast'
import DuplicateConfirmModal from '@/components/DuplicateConfirmModal'
import type { RouteData, RoutePoint, ChartDataPoint, PaceHeartRateSettings } from '@/types'

// Dynamically import MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
})

export default function HomePage() {
  const [routeData, setRouteData] = useState<RouteData>({
    points: [] as RoutePoint[],
    distance: 0,
    duration: 0,
    elevationGain: 0,
    averagePace: 5.5,
  })

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]) 
  const [loadedChartData, setLoadedChartData] = useState<ChartDataPoint[] | undefined>(undefined)
  
  // Debug: Track chartData state changes
  useEffect(() => {
    console.log('🔄🔄🔄 HomePage: chartData state changed:', {
      length: chartData.length,
      timestamp: new Date().toISOString(),
      hasData: chartData.length > 0,
      firstPoint: chartData[0] || 'none',
      hasHeartRate: chartData.some(p => p.heartRate && p.heartRate > 0)
    })
  }, [chartData])
  const [selectedShape, setSelectedShape] = useState<'draw' | 'heart' | 'circle'>('draw')
  const [showWaypoints, setShowWaypoints] = useState(true)
  const [activityType, setActivityType] = useState<'run' | 'bike'>('run')
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')
  const [showSaveModal, setShowSaveModal] = useState(false)

  const [paceHeartRateSettings, setPaceHeartRateSettings] = useState<PaceHeartRateSettings>({
    averagePace: 5.5,
    paceInconsistency: 30,
    includeHeartRate: false,
    averageHeartRate: 150,
    heartRateVariability: 20
  })

  const { saveRoute, validateRouteName, overwriteRoute, isLoading: isSavingRoute } = useSavedRoutesStore()
  const { isAuthenticated, checkAuth } = useAuthStore()
  const { toast, showSuccess, showError, hideToast } = useToast()
  const [isLoadingSavedRoute, setIsLoadingSavedRoute] = useState(false)
  const [runName, setRunName] = useState('')
  const [runDescription, setRunDescription] = useState('')
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0])
  const [runStartTime, setRunStartTime] = useState('12:00')
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRouteName, setDuplicateRouteName] = useState('')

  // Handle save route with duplicate checking
  const handleSaveRoute = async () => {
    console.log('🚀🚀🚀 HomePage: handleSaveRoute called - START', {
      isAuthenticated,
      runName,
      routePointsLength: routeData?.points?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (!runName.trim()) {
      console.log('❌ HomePage: No run name provided');
      showError('Please enter a run name')
      return
    }
    
    if (!routeData || routeData.points.length < 2) {
      console.log('❌ HomePage: Insufficient route points');
      showError('Please create a route with at least 2 points')
      return
    }

    // If not authenticated, show the modal for login
    if (!isAuthenticated) {
      console.log('❌ HomePage: User not authenticated, showing save modal');
      setShowSaveModal(true)
      return
    }

    try {
      // Check for duplicate route name
      const nameExists = await validateRouteName(runName.trim())
      console.log('🔍 HomePage: Duplicate check result:', { nameExists, runName: runName.trim() });
      
      if (nameExists) {
        // Show custom duplicate confirmation modal
        setDuplicateRouteName(runName.trim())
        setShowDuplicateModal(true)
        return
      }
      
      // No duplicate found - save directly without modal
      console.log('✅ HomePage: No duplicate found, saving route directly...');
      const routeDataWithSettings = {
        ...routeData,
        activityType,
        paceHeartRateSettings: paceHeartRateSettings
      }
      
      const savedRoute = await saveRoute(
        routeDataWithSettings,
        chartData,
        activityType,
        runName.trim(),
        runDescription.trim(),
        runDate,
        runStartTime,
        paceHeartRateSettings
      )
      
      if (savedRoute) {
        showSuccess('Route saved successfully!')
      }
      
    } catch (error) {
      console.error('❌ HomePage: Error in handleSaveRoute:', error);
      showError('Failed to save route')
    }
  }

  // Handle duplicate route confirmation
  const handleDuplicateConfirm = async () => {
    setShowDuplicateModal(false)
    
    try {
      console.log('✅ HomePage: User confirmed overwrite, saving route...');
      const routeDataWithSettings = {
        ...routeData,
        activityType,
        paceHeartRateSettings: paceHeartRateSettings
      }
      
      await overwriteRoute(
        routeDataWithSettings,
        chartData,
        activityType,
        duplicateRouteName,
        runDescription.trim(),
        runDate,
        runStartTime,
        paceHeartRateSettings
      )
      
      showSuccess('Route overwritten successfully!')
    } catch (error) {
      console.error('❌ HomePage: Error overwriting route:', error);
      showError('Failed to overwrite route')
    }
  }

  const handleDuplicateCancel = () => {
    setShowDuplicateModal(false)
    setDuplicateRouteName('')
    console.log('❌ HomePage: User cancelled overwrite');
  }

  const handleRunDetailsChange = (name: string, description: string, date: string, startTime: string) => {
    setRunName(name)
    setRunDescription(description)
    setRunDate(date)
    setRunStartTime(startTime)
  }
  useEffect(() => {
    console.log('🎯 HomePage: paceHeartRateSettings state changed:', {
      includeHeartRate: paceHeartRateSettings.includeHeartRate,
      averageHeartRate: paceHeartRateSettings.averageHeartRate,
      averagePace: paceHeartRateSettings.averagePace,
      paceInconsistency: paceHeartRateSettings.paceInconsistency,
      heartRateVariability: paceHeartRateSettings.heartRateVariability
    })
  }, [paceHeartRateSettings])

  // Check authentication state on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Load route from session storage (when coming from saved routes)
  useEffect(() => {
    console.log('🔍 HomePage: useEffect triggered - checking for loadRouteData in sessionStorage')
    
    // Force logging to ensure this runs
    console.log('🔍 HomePage: Current timestamp:', new Date().toISOString())
    console.log('🔍 HomePage: All sessionStorage keys:', Object.keys(sessionStorage))
    
    // Add a small delay to ensure sessionStorage is fully written before reading
    const checkSessionStorage = () => {
      const loadRouteData = sessionStorage.getItem('loadRouteData')
      console.log('🔍 HomePage: sessionStorage check result:', {
        hasData: !!loadRouteData,
        dataLength: loadRouteData?.length || 0,
        firstChars: loadRouteData?.substring(0, 50) || 'none'
      })
      
      if (loadRouteData) {
        console.log('💾 HomePage: Found loadRouteData in sessionStorage')
        console.log('📝 HomePage: Full loadRouteData content:', loadRouteData)
        
        try {
          const parsed = JSON.parse(loadRouteData)
          
          console.log('📁 HomePage: Successfully parsed route data:', {
            hasRouteData: !!parsed.routeData,
            routeDataType: typeof parsed.routeData,
            pointsCount: parsed.routeData?.points?.length || 0,
            coordinatesCount: parsed.routeData?.routeCoordinates?.length || 0,
            activityType: parsed.activityType,
            hasChartData: !!parsed.chartData,
            chartDataLength: parsed.chartData?.length || 0
          })
          
          // Validate and set route data with proper fallbacks
          if (parsed.routeData && typeof parsed.routeData === 'object') {
            const validatedRouteData: RouteData = {
              points: Array.isArray(parsed.routeData.points) ? parsed.routeData.points : [],
              distance: typeof parsed.routeData.distance === 'number' ? parsed.routeData.distance : 0,
              duration: typeof parsed.routeData.duration === 'number' ? parsed.routeData.duration : 0,
              elevationGain: typeof parsed.routeData.elevationGain === 'number' ? parsed.routeData.elevationGain : 0,
              averagePace: typeof parsed.routeData.averagePace === 'number' ? parsed.routeData.averagePace : 5.5,
              routeGeometry: parsed.routeData.routeGeometry,
              routeCoordinates: Array.isArray(parsed.routeData.routeCoordinates) ? parsed.routeData.routeCoordinates : undefined,
              routeElevations: Array.isArray(parsed.routeData.routeElevations) ? parsed.routeData.routeElevations : undefined
            }
            
            console.log('🗺️ HomePage: Setting loaded route data:', {
              points: validatedRouteData.points.length,
              coordinates: validatedRouteData.routeCoordinates?.length || 0,
              distance: validatedRouteData.distance,
              hasGeometry: !!validatedRouteData.routeGeometry,
              firstPoint: validatedRouteData.points[0] || 'none',
              lastPoint: validatedRouteData.points[validatedRouteData.points.length - 1] || 'none'
            })
            
            setIsLoadingSavedRoute(true) // Mark as loading saved route
            setRouteData(validatedRouteData)
            
            // Reset the flag after a delay to allow auto-fit to complete
            setTimeout(() => {
              setIsLoadingSavedRoute(false)
            }, 2000)
            
            // Immediately log what state should be after setting
            console.log('🗺️ HomePage: State should be updated to:', validatedRouteData)
            console.log('🗺️ HomePage: Current routeData state (before re-render):', routeData)
          } else {
            console.warn('⚠️ HomePage: Invalid or missing routeData in parsed object')
          }
          
          // Set other data with validation
          if (Array.isArray(parsed.chartData)) {
            console.log('📈 HomePage: Setting chart data with', parsed.chartData.length, 'points')
            console.log('💓 HomePage: Heart rate data analysis:', {
              chartDataLength: parsed.chartData.length,
              hasHeartRateData: parsed.chartData.some((p: any) => p.heartRate && p.heartRate > 0),
              heartRateCount: parsed.chartData.filter((p: any) => p.heartRate && p.heartRate > 0).length,
              sampleHeartRates: parsed.chartData.slice(0, 5).map((p: any) => ({
                distance: p.distance,
                heartRate: p.heartRate
              }))
            })
            
            console.log('🔥🔥🔥 HomePage: CRITICAL - About to set loadedChartData state with:', {
              dataLength: parsed.chartData.length,
              timestamp: new Date().toISOString(),
              firstPoint: parsed.chartData[0],
              lastPoint: parsed.chartData[parsed.chartData.length - 1]
            })
            
            // Set loaded chart data for InteractiveDataVisualization to use as existingChartData
            setLoadedChartData(parsed.chartData)
            // Also set chartData for other components that need it
            setChartData(parsed.chartData)
            
            // Verify state was set (this will show in next render)
            console.log('✅✅✅ HomePage: loadedChartData and chartData states should be updated on next render')
          } else {
            console.warn('⚠️ HomePage: No valid chart data found in parsed object')
            setLoadedChartData(undefined)
          }
          
          if (parsed.activityType === 'run' || parsed.activityType === 'bike') {
            console.log('🏃 HomePage: Setting activity type to', parsed.activityType)
            setActivityType(parsed.activityType)
          }
          
          // Restore saved run details (name, description, date, startTime)
          // First try 'routeName' (from saved routes page), then 'name' (from route data)
          if (parsed.routeName || parsed.name) {
            const routeName = parsed.routeName || parsed.name
            console.log('📝 HomePage: Restoring saved run name:', routeName)
            setRunName(routeName)
          } else {
            setRunName('') // Clear name if not saved
          }
          
          if (parsed.description) {
            console.log('📝 HomePage: Restoring saved run description:', parsed.description)
            setRunDescription(parsed.description)
          } else {
            setRunDescription('') // Clear description if not saved
          }
          
          if (parsed.date) {
            console.log('📅 HomePage: Restoring saved run date:', parsed.date)
            setRunDate(parsed.date)
          } else {
            setRunDate(new Date().toISOString().split('T')[0]) // Reset to today
          }
          
          if (parsed.startTime) {
            console.log('⏰ HomePage: Restoring saved run start time:', parsed.startTime)
            setRunStartTime(parsed.startTime)
          } else {
            setRunStartTime('12:00') // Reset to default
          }
          
          // Check if there are any heart rate settings to restore
          if (parsed.paceHeartRateSettings) {
            console.log('⚙️ HomePage: Found pace/HR settings in loaded data:', {
              includeHeartRate: parsed.paceHeartRateSettings.includeHeartRate,
              averageHeartRate: parsed.paceHeartRateSettings.averageHeartRate,
              averagePace: parsed.paceHeartRateSettings.averagePace,
              paceInconsistency: parsed.paceHeartRateSettings.paceInconsistency,
              heartRateVariability: parsed.paceHeartRateSettings.heartRateVariability,
              settingsType: typeof parsed.paceHeartRateSettings,
              settingsKeys: Object.keys(parsed.paceHeartRateSettings),
              fullSettingsObject: parsed.paceHeartRateSettings
            })
            
            console.log('🔄 HomePage: Setting paceHeartRateSettings state...')
            setPaceHeartRateSettings(parsed.paceHeartRateSettings)
            
            // Verify state will be set correctly
            console.log('✅ HomePage: State should be updated to:', parsed.paceHeartRateSettings)
          } else {
            console.log('⚠️ HomePage: No pace/HR settings found in loaded data')
            console.log('🔍 HomePage: Parsed object keys:', Object.keys(parsed))
            console.log('🔍 HomePage: Full parsed object:', parsed)
            
            // If we have heart rate data in chartData, enable heart rate
            if (parsed.chartData && parsed.chartData.some((p: any) => p.heartRate && p.heartRate > 0)) {
              console.log('💡 HomePage: Found HR data in chartData, enabling heart rate settings')
              setPaceHeartRateSettings(prev => ({
                ...prev,
                includeHeartRate: true
              }))
            }
          }
          
          // Delay clearing sessionStorage to allow components to initialize with the data
          console.log('⏳ HomePage: Scheduling sessionStorage cleanup in 2 seconds...')
          setTimeout(() => {
            console.log('🧹 HomePage: Clearing sessionStorage after component initialization')
            sessionStorage.removeItem('loadRouteData')
          }, 2000)
          
        } catch (error) {
          console.error('❌ HomePage: Failed to parse route data:', error)
          console.error('📝 HomePage: Raw data that failed to parse:', loadRouteData)
          // Clear invalid session storage data
          sessionStorage.removeItem('loadRouteData')
        }
      } else {
        console.log('🔍 HomePage: No loadRouteData found in sessionStorage')
        console.log('🔍 HomePage: All sessionStorage keys:', Object.keys(sessionStorage))
      }
    }
    
    // Run immediately and also with a small delay to handle race conditions
    checkSessionStorage()
    const timeoutId = setTimeout(checkSessionStorage, 100)
    
    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Custom Route
          </h2>
          <p className="text-gray-600">
            Draw your route, search for a location and click on the map to create your route
          </p>
        </div>

        {/* Compact Control Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            {/* Drawing Tools - Left Side */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Tools:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedShape('draw')}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                    selectedShape === 'draw'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✏️ Draw
                </button>
                <button
                  onClick={() => setSelectedShape('heart')}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                    selectedShape === 'heart'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ❤️
                </button>
                <button
                  onClick={() => setSelectedShape('circle')}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                    selectedShape === 'circle'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⭕
                </button>
              </div>
            </div>
            
            {/* Activity and Units - Right Side */}
            <div className="flex items-center gap-6">
              {/* Activity Type Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Activity:</span>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-0.5 flex">
                  <button
                    onClick={() => setActivityType('run')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 cursor-pointer ${
                      activityType === 'run'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    🏃‍♂️ Run
                  </button>
                  <button
                    onClick={() => setActivityType('bike')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 cursor-pointer ${
                      activityType === 'bike'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    🚴‍♂️ Bike
                  </button>
                </div>
              </div>

              {/* Units Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Units:</span>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-0.5 flex">
                  <button
                    onClick={() => setUnitSystem('metric')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 cursor-pointer ${
                      unitSystem === 'metric'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Metric
                  </button>
                  <button
                    onClick={() => setUnitSystem('imperial')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 cursor-pointer ${
                      unitSystem === 'imperial'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Imperial
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Map */}
          <div className="lg:col-span-2">
            <div className="card-map">
              <div className="h-96 rounded-lg overflow-hidden">
                {/* Debug: Log what we're passing to MapComponent */}
                {(() => {
                  const initialData = routeData && routeData.points && routeData.points.length > 0 ? routeData : undefined
                  console.log('🗺️ HomePage: Render - MapComponent props:', {
                    hasInitialData: !!initialData,
                    pointsCount: initialData?.points?.length || 0,
                    coordinatesCount: initialData?.routeCoordinates?.length || 0,
                    fullRouteData: routeData,
                    routeDataType: typeof routeData,
                    routeDataKeys: Object.keys(routeData || {}),
                    firstPoint: routeData?.points?.[0],
                    passesCondition: !!(routeData && routeData.points && routeData.points.length > 0)
                  })
                  return null
                })()} 
                <MapComponent
                  onRouteChange={setRouteData}
                  selectedShape={selectedShape}
                  showWaypoints={showWaypoints}
                  onShowWaypointsChange={setShowWaypoints}
                  initialRouteData={routeData && routeData.points && routeData.points.length > 0 ? routeData : undefined}
                  disableAutoFit={!isLoadingSavedRoute}
                />
              </div>
            </div>

            {/* Data Visualization */}
            <div className="mt-8">
              <InteractiveDataVisualization
            routeData={routeData}
            paceHeartRateSettings={paceHeartRateSettings}
            activityType={activityType}
            unitSystem={unitSystem}
            onChartDataChange={setChartData}
            existingChartData={loadedChartData} // Pass loaded chart data from sessionStorage
          />
            </div>
          </div>

          {/* Right Column - Stats and Controls */}
          <div className="space-y-6">
            <RouteStats 
              routeData={routeData} 
              unitSystem={unitSystem} 
              activityType={activityType}
              paceHeartRateSettings={paceHeartRateSettings}
              onUnitSystemChange={setUnitSystem}
              onActivityTypeChange={setActivityType}
              onPaceHeartRateSettingsChange={setPaceHeartRateSettings}
            />
            <RunDetails 
              routeData={routeData} 
              chartData={chartData} 
              activityType={activityType}
              paceHeartRateSettings={paceHeartRateSettings}
              onSaveRoute={handleSaveRoute}
              onRunDetailsChange={handleRunDetailsChange}
              isSaving={isSavingRoute}
              initialName={runName}
              initialDescription={runDescription}
              initialDate={runDate}
              initialStartTime={runStartTime}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      </main>
      
      {/* Save Route Modal */}
      <SaveRouteModal 
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        routeData={routeData}
        chartData={chartData}
        activityType={activityType}
        paceHeartRateSettings={paceHeartRateSettings}
        initialName={runName}
        initialDescription={runDescription}
        initialDate={runDate}
        initialStartTime={runStartTime}
      />
      
      {/* Duplicate Confirmation Modal */}
      <DuplicateConfirmModal
        isOpen={showDuplicateModal}
        routeName={duplicateRouteName}
        onConfirm={handleDuplicateConfirm}
        onCancel={handleDuplicateCancel}
      />
      
      {/* Toast Notification */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </div>
  )
}