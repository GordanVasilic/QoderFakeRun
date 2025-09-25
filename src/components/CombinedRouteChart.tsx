'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot
} from 'recharts'
import { formatPace, convertPaceForDisplay, paceToSpeed, formatSpeed } from '@/utils/mapUtils'
import type { RouteData, ChartDataPoint, PaceHeartRateSettings } from '@/types'

interface CombinedRouteChartProps {
  routeData: RouteData
  chartData: ChartDataPoint[]
  paceHeartRateSettings?: PaceHeartRateSettings
  activityType: 'run' | 'bike'
  unitSystem: 'metric' | 'imperial'
}

interface MetricVisibility {
  elevation: boolean
  pace: boolean
  heartRate: boolean
}

export default function CombinedRouteChart({ 
  routeData, 
  chartData, 
  paceHeartRateSettings,
  activityType,
  unitSystem
}: CombinedRouteChartProps) {
  const [editMode, setEditMode] = useState<'pace' | 'heartRate' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activePoint, setActivePoint] = useState<number | null>(null)
  const [metricVisibility, setMetricVisibility] = useState<MetricVisibility>({
    elevation: true,
    pace: true,
    heartRate: paceHeartRateSettings?.includeHeartRate || false
  })

  // Update heart rate visibility when settings change
  useEffect(() => {
    if (paceHeartRateSettings?.includeHeartRate !== undefined) {
      setMetricVisibility(prev => ({
        ...prev,
        heartRate: paceHeartRateSettings.includeHeartRate
      }))
    }
  }, [paceHeartRateSettings?.includeHeartRate])

  // Calculate chart statistics
  const chartStats = useMemo(() => {
    if (chartData.length === 0) return null

    const elevations = chartData.map(d => d.elevation || 0)
    const paces = chartData.map(d => d.pace || 0).filter(p => p > 0)
    const heartRates = chartData.map(d => d.heartRate || 0).filter(hr => hr > 0)

    const maxElevation = Math.max(...elevations)
    const minElevation = Math.min(...elevations)
    const elevationGain = chartData.reduce((total, point, index) => {
      if (index === 0) return 0
      const elevationDiff = (point.elevation || 0) - (chartData[index - 1].elevation || 0)
      return total + (elevationDiff > 0 ? elevationDiff : 0)
    }, 0)

    const avgPace = paces.length > 0 ? paces.reduce((sum, p) => sum + p, 0) / paces.length : 0
    const avgHeartRate = heartRates.length > 0 ? heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length : 0

    return {
      maxElevation,
      minElevation,
      elevationGain,
      avgPace,
      avgHeartRate,
      totalDistance: chartData[chartData.length - 1]?.distance || 0
    }
  }, [chartData])

  // Toggle metric visibility
  const toggleMetric = useCallback((metric: keyof MetricVisibility) => {
    setMetricVisibility(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }))
  }, [])

  // Handle chart interactions
  const handleChartMouseMove = useCallback((data: any) => {
    if (!editMode || !isDragging || activePoint === null) return
    // Chart editing logic would go here
  }, [editMode, isDragging, activePoint])

  // Transform chart data for proper display with unit conversion
  const transformedChartData = useMemo(() => {
    return chartData.map(point => {
      let transformedDistance = point.distance
      let transformedPace = point.pace
      
      // Convert distance for imperial units
      if (unitSystem === 'imperial') {
        transformedDistance = point.distance * 0.621371 // km to miles
      }
      
      // Handle pace/speed conversion
      if (transformedPace) {
        if (activityType === 'bike') {
          // For bike mode, convert pace to speed
          const speed = paceToSpeed(transformedPace)
          transformedPace = unitSystem === 'imperial' ? speed * 0.621371 : speed // Convert to mph if imperial
        } else {
          // For running, convert pace if imperial
          if (unitSystem === 'imperial') {
            transformedPace = transformedPace * 1.609344 // min/km to min/mile
          }
        }
      }
      
      return {
        ...point,
        distance: transformedDistance,
        pace: transformedPace
      }
    })
  }, [chartData, activityType, unitSystem])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const distanceUnit = unitSystem === 'imperial' ? 'mi' : 'km'
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{`Distance: ${label} ${distanceUnit}`}</p>
          {payload.map((entry: { value: number; dataKey: string; color: string }, index: number) => {
            if (!metricVisibility[entry.dataKey as keyof MetricVisibility]) return null
            
            let value: string | number = entry.value
            let unit = ''
            const color = entry.color

            switch (entry.dataKey) {
              case 'elevation':
                value = `${Math.round(entry.value)}m`
                unit = 'Elevation'
                break
              case 'pace':
                if (activityType === 'bike') {
                  // For bike mode, value is already speed
                  value = formatSpeed(entry.value)
                  unit = `Speed (${unitSystem === 'imperial' ? 'mph' : 'km/h'})`
                } else {
                  // For running, value is already converted pace
                  value = formatPace(entry.value)
                  unit = `Pace (${unitSystem === 'imperial' ? 'min/mi' : 'min/km'})`
                }
                break
              case 'heartRate':
                value = `${Math.round(entry.value)} bpm`
                unit = 'Heart Rate'
                break
            }

            return (
              <p key={index} className="text-sm" style={{ color }}>
                {`${unit}: ${value}`}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  // Format Y-axis ticks
  const formatElevationTick = (value: number) => `${Math.round(value)}m`
  const formatPaceOrSpeedTick = (value: number) => {
    if (activityType === 'bike') {
      // For bike mode, value is already speed in the appropriate unit
      return formatSpeed(value)
    }
    // For running, value is already pace in the appropriate unit
    return formatPace(value)
  }
  const formatHeartRateTick = (value: number) => `${Math.round(value)}`

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Performance</h3>
        <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Draw a route to see performance data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header with metrics toggles */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Route Performance</h3>
          </div>
          
          {/* Improved toggle buttons with better visual design */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Show/Hide:</span>
            
            <button
              onClick={() => toggleMetric('elevation')}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                metricVisibility.elevation
                  ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-green-300'
              }`}
              title={metricVisibility.elevation ? 'Hide elevation data' : 'Show elevation data'}
            >
              <div className={`w-2 h-2 rounded transition-all ${
                metricVisibility.elevation ? 'bg-green-300' : 'bg-green-500 group-hover:bg-green-400'
              }`} />
              <span>Elevation</span>
              {metricVisibility.elevation ? (
                <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 14.707a1 1 0 01-1.414-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 10.414l-4.293 4.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3 ml-0.5 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={() => toggleMetric('pace')}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                metricVisibility.pace
                  ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-blue-300'
              }`}
              title={metricVisibility.pace ? `Hide ${activityType === 'bike' ? 'speed' : 'pace'} data` : `Show ${activityType === 'bike' ? 'speed' : 'pace'} data`}
            >
              <div className={`w-2 h-2 rounded transition-all ${
                metricVisibility.pace ? 'bg-blue-300' : 'bg-blue-500 group-hover:bg-blue-400'
              }`} />
              <span>{activityType === 'bike' ? 'Speed' : 'Pace'}</span>
              {metricVisibility.pace ? (
                <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 14.707a1 1 0 01-1.414-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 10.414l-4.293 4.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3 ml-0.5 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {paceHeartRateSettings?.includeHeartRate && (
              <button
                onClick={() => toggleMetric('heartRate')}
                className={`group flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  metricVisibility.heartRate
                    ? 'bg-red-500 text-white shadow-md hover:bg-red-600'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-red-300'
                }`}
                title={metricVisibility.heartRate ? 'Hide heart rate data' : 'Show heart rate data'}
              >
                <div className={`w-2 h-2 rounded transition-all ${
                  metricVisibility.heartRate ? 'bg-red-300' : 'bg-red-500 group-hover:bg-red-400'
                }`} />
                <span>Heart Rate</span>
                {metricVisibility.heartRate ? (
                  <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.707 14.707a1 1 0 01-1.414-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 10.414l-4.293 4.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 ml-0.5 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Combined Chart */}
      <div className="p-2">
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={transformedChartData}
              onMouseMove={handleChartMouseMove}
              margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
            >
              <defs>
                <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              
              {/* X-axis */}
              <XAxis 
                dataKey="distance" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{ 
                  value: `Distance (${unitSystem === 'imperial' ? 'mi' : 'km'})`, 
                  position: 'insideBottom', 
                  offset: -10,
                  style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
                }}
              />

              {/* Left Y-axis for elevation */}
              {metricVisibility.elevation && (
                <YAxis 
                  yAxisId="elevation"
                  stroke="#10b981"
                  fontSize={12}
                  tickFormatter={formatElevationTick}
                  tickLine={false}
                  axisLine={false}
                  label={{ 
                    value: 'Elevation (m)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#10b981', fontSize: '12px' }
                  }}
                />
              )}

              {/* Right Y-axis for pace */}
              {metricVisibility.pace && (
                <YAxis 
                  yAxisId="pace"
                  orientation="right"
                  stroke="#3b82f6"
                  fontSize={12}
                  tickFormatter={formatPaceOrSpeedTick}
                  tickLine={false}
                  axisLine={false}
                  label={{ 
                    value: activityType === 'bike' 
                      ? `Speed (${unitSystem === 'imperial' ? 'mph' : 'km/h'})` 
                      : `Pace (${unitSystem === 'imperial' ? 'min/mi' : 'min/km'})`, 
                    angle: 90, 
                    position: 'insideRight',
                    style: { textAnchor: 'middle', fill: '#3b82f6', fontSize: '12px' }
                  }}
                />
              )}

              {/* Far right Y-axis for heart rate */}
              {metricVisibility.heartRate && paceHeartRateSettings?.includeHeartRate && (
                <YAxis 
                  yAxisId="heartRate"
                  orientation="right"
                  stroke="#ef4444"
                  fontSize={12}
                  tickFormatter={formatHeartRateTick}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  label={{ 
                    value: 'HR (bpm)', 
                    angle: 90, 
                    position: 'outside',
                    offset: 40,
                    style: { textAnchor: 'middle', fill: '#ef4444', fontSize: '12px' }
                  }}
                />
              )}

              <Tooltip content={<CustomTooltip />} />

              {/* Elevation area */}
              {metricVisibility.elevation && (
                <Area
                  yAxisId="elevation"
                  type="basis"
                  dataKey="elevation"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#elevationGradient)"
                  fillOpacity={0.6}
                  connectNulls={true}
                />
              )}

              {/* Pace line */}
              {metricVisibility.pace && (
                <Line
                  yAxisId="pace"
                  type="basis"
                  dataKey="pace"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={true}
                  activeDot={{ 
                    r: 5, 
                    fill: '#1d4ed8',
                    stroke: '#ffffff',
                    strokeWidth: 2
                  }}
                />
              )}

              {/* Heart rate line */}
              {metricVisibility.heartRate && paceHeartRateSettings?.includeHeartRate && (
                <Line
                  yAxisId="heartRate"
                  type="basis"
                  dataKey="heartRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={true}
                  activeDot={{ 
                    r: 4, 
                    fill: '#dc2626',
                    stroke: '#ffffff',
                    strokeWidth: 2
                  }}
                />
              )}

              {/* Active point indicator */}
              {editMode && activePoint !== null && (
                <ReferenceDot
                  x={transformedChartData[activePoint]?.distance}
                  y={editMode === 'pace' ? transformedChartData[activePoint]?.pace : transformedChartData[activePoint]?.heartRate}
                  r={8}
                  fill={editMode === 'pace' ? '#1d4ed8' : '#dc2626'}
                  stroke="white"
                  strokeWidth={3}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}