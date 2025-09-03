'use client'

import React, { useState, useEffect, useRef } from 'react'
import { RouteData, PaceHeartRateSettings, ChartDataPoint } from '@/types'
import { calculateDistance, generateRealisticPace, generateRealisticHeartRate } from '@/utils/mapUtils'
import CombinedRouteChart from './CombinedRouteChart'

interface DataVisualizationProps {
  routeData: RouteData
  paceHeartRateSettings?: PaceHeartRateSettings
  activityType: 'run' | 'bike'
  unitSystem: 'metric' | 'imperial'
  onChartDataChange?: (chartData: ChartDataPoint[]) => void
  existingChartData?: ChartDataPoint[] // Add support for existing saved chart data
}

export default function InteractiveDataVisualization({ 
  routeData, 
  paceHeartRateSettings, 
  activityType,
  unitSystem,
  onChartDataChange,
  existingChartData
}: DataVisualizationProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const hasSetExistingData = useRef(false)
  
  // Debug: Track existingChartData prop changes
  useEffect(() => {
    console.log('🎯🎯🎯 DataVisualization: existingChartData prop changed:', {
      hasExistingData: !!(existingChartData && existingChartData.length > 0),
      length: existingChartData?.length || 0,
      timestamp: new Date().toISOString(),
      hasSetExistingDataFlag: hasSetExistingData.current,
      firstPoint: existingChartData?.[0] || 'none'
    })
  }, [existingChartData])
  
  // Log component props on every render
  console.log('🏗️ DataVisualization: Component render with props:', {
    timestamp: new Date().toISOString(),
    hasExistingChartData: !!(existingChartData && existingChartData.length > 0),
    existingChartDataLength: existingChartData?.length || 0,
    routeDataPointsCount: routeData?.points?.length || 0,
    paceHeartRateSettings: paceHeartRateSettings,
    activityType,
    unitSystem,
    currentChartDataLength: chartData.length,
    hasSetExistingDataFlag: hasSetExistingData.current
  })

  // Separate effect to handle onChartDataChange callback when using existing data
  useEffect(() => {
    if (chartData.length > 0 && hasSetExistingData.current && onChartDataChange) {
      onChartDataChange(chartData)
    }
  }, [chartData, onChartDataChange])

  // Initialize chart data when route or settings change
  useEffect(() => {
    console.log('🔥 DataVisualization: useEffect triggered - DETAILED ANALYSIS:', {
      timestamp: new Date().toISOString(),
      routePointsCount: routeData.points.length,
      hasRouteCoordinates: !!(routeData.routeCoordinates && routeData.routeCoordinates.length > 0),
      paceHeartRateSettings: paceHeartRateSettings,
      includeHeartRate: paceHeartRateSettings?.includeHeartRate || false,
      hasExistingChartData: !!(existingChartData && existingChartData.length > 0),
      existingChartDataLength: existingChartData?.length || 0,
      hasSetExistingData: hasSetExistingData.current,
      existingChartDataSample: existingChartData?.slice(0, 2),
      componentProps: {
        routeDataKeys: Object.keys(routeData),
        activityType,
        unitSystem
      }
    })
    
    // If we have existing chart data (from saved route), use it instead of regenerating
    if (existingChartData && existingChartData.length > 0 && !hasSetExistingData.current) {
      console.log('🎯🎯🎯 DataVisualization: USING EXISTING CHART DATA - This should show the saved route visualization!')
      console.log('📊📊📊 DataVisualization: Using existing saved chart data with', existingChartData.length, 'points')
      console.log('💓💓💓 DataVisualization: Existing chart data FULL ANALYSIS:', {
        hasHeartRateData: existingChartData.some(p => p.heartRate && p.heartRate > 0),
        heartRateCount: existingChartData.filter(p => p.heartRate && p.heartRate > 0).length,
        totalPoints: existingChartData.length,
        firstPoint: existingChartData[0],
        lastPoint: existingChartData[existingChartData.length - 1],
        sampleData: existingChartData.slice(0, 5).map(p => ({
          distance: p.distance,
          pace: p.pace,
          elevation: p.elevation,
          heartRate: p.heartRate
        })),
        allHeartRates: existingChartData.map(p => p.heartRate).filter(hr => hr && hr > 0),
        timestamp: new Date().toISOString()
      })
      setChartData(existingChartData)
      hasSetExistingData.current = true
      console.log('✅✅✅ DataVisualization: Chart data state updated with existing data, should render properly now!')
      console.log('🚀🚀🚀 DataVisualization: State after setting existing data:', {
        chartDataLength: existingChartData.length,
        hasSetExistingDataFlag: hasSetExistingData.current,
        willSkipRegeneration: true
      })
      // Don't call onChartDataChange here to avoid infinite loop
      return
    }
    
    // Skip regeneration if we're using existing data
    if (hasSetExistingData.current && existingChartData && existingChartData.length > 0) {
      return
    }
    
    if (routeData.points.length < 2) {
      setChartData([])
      return
    }

    const data: ChartDataPoint[] = []

    // Use complete route coordinates if available, otherwise fall back to waypoints
    const useRouteCoordinates = routeData.routeCoordinates && 
                               routeData.routeCoordinates.length > 0 && 
                               routeData.routeElevations &&
                               routeData.routeElevations.length > 0

    if (useRouteCoordinates) {
      // Generate data for complete route path
      const routeCoords = routeData.routeCoordinates!
      const routeElevs = routeData.routeElevations!
      
      console.log('📊 Generating pace/HR data for', routeCoords.length, 'route coordinates')
      
      // Calculate distances for all route coordinates
      const distances: number[] = [0]
      let cumulativeDistance = 0
      
      for (let i = 1; i < routeCoords.length; i++) {
        const prev = routeCoords[i - 1]
        const curr = routeCoords[i]
        const distance = calculateDistance(prev[1], prev[0], curr[1], curr[0]) // [lng, lat] -> lat, lng
        cumulativeDistance += distance
        distances.push(cumulativeDistance)
      }

      // Create points array for pace/heart rate generation
      const routePoints = routeCoords.map((coord, index) => ({
        lat: coord[1], // [lng, lat] -> lat
        lng: coord[0], // [lng, lat] -> lng
        elevation: routeElevs[index] || 0
      }))

      // Generate realistic pace data for all route points
      const settings = paceHeartRateSettings || {
        averagePace: routeData.averagePace || 5.5,
        paceInconsistency: 30,
        includeHeartRate: false,
        averageHeartRate: 150,
        heartRateVariability: 20
      }

      const paces = generateRealisticPace(
        routePoints,
        settings.averagePace,
        settings.paceInconsistency
      )

      // Generate realistic heart rate data if enabled
      const heartRates = settings.includeHeartRate
        ? generateRealisticHeartRate(
            routePoints,
            paces,
            settings.averageHeartRate,
            settings.heartRateVariability
          )
        : []
        
      console.log('💓 DataVisualization: Generated heart rate data:', {
        includeHeartRate: settings.includeHeartRate,
        heartRatesLength: heartRates.length,
        sampleHeartRates: heartRates.slice(0, 5)
      })

      // Build chart data for all route coordinates
      for (let i = 0; i < routeCoords.length; i++) {
        data.push({
          distance: Number(distances[i].toFixed(2)),
          pace: paces[i],
          elevation: routeElevs[i] || 0,
          heartRate: settings.includeHeartRate ? heartRates[i] : undefined
        })
      }
      
      console.log('✅ Generated', data.length, 'data points for complete route with HR status:', {
        dataLength: data.length,
        includeHeartRate: settings.includeHeartRate,
        firstFewPoints: data.slice(0, 3).map(p => ({
          distance: p.distance,
          heartRate: p.heartRate
        }))
      })
    } else {
      // Fallback to waypoints-only generation
      console.log('📊 Generating pace/HR data for', routeData.points.length, 'waypoints only')
      
      let cumulativeDistance = 0

      // Calculate distances
      const distances: number[] = [0]
      for (let i = 1; i < routeData.points.length; i++) {
        const prev = routeData.points[i - 1]
        const curr = routeData.points[i]
        const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
        cumulativeDistance += distance
        distances.push(cumulativeDistance)
      }

      // Generate realistic pace data
      const settings = paceHeartRateSettings || {
        averagePace: routeData.averagePace || 5.5,
        paceInconsistency: 30,
        includeHeartRate: false,
        averageHeartRate: 150,
        heartRateVariability: 20
      }

      const paces = generateRealisticPace(
        routeData.points,
        settings.averagePace,
        settings.paceInconsistency
      )

      // Generate realistic heart rate data if enabled
      const heartRates = settings.includeHeartRate
        ? generateRealisticHeartRate(
            routeData.points,
            paces,
            settings.averageHeartRate,
            settings.heartRateVariability
          )
        : []

      // Build chart data
      for (let i = 0; i < routeData.points.length; i++) {
        data.push({
          distance: Number(distances[i].toFixed(2)),
          pace: paces[i],
          elevation: routeData.points[i].elevation || 0,
          heartRate: settings.includeHeartRate ? heartRates[i] : undefined
        })
      }
    }

    setChartData(data)
  }, [routeData, paceHeartRateSettings])

  return (
    <div className="space-y-6">
      <CombinedRouteChart 
        routeData={routeData}
        chartData={chartData}
        paceHeartRateSettings={paceHeartRateSettings}
        activityType={activityType}
        unitSystem={unitSystem}
      />
    </div>
  )
}