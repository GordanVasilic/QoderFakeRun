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
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Route Performance</h3>
            <div className="text-sm text-gray-600">
              {((chartStats?.totalDistance || 0) * (unitSystem === 'imperial' ? 0.621371 : 1)).toFixed(2)} {unitSystem === 'imperial' ? 'mi' : 'km'} • {chartData.length} data points
            </div>
          </div>
          {/* Quick stats - inline on the right */}
          {chartStats && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {metricVisibility.elevation && (
                <span>Max Elevation: <strong>{Math.round(chartStats.maxElevation)}m</strong></span>
              )}
              {metricVisibility.pace && (
                <span>
                  {activityType === 'bike' 
                    ? (() => {
                        const speed = paceToSpeed(chartStats.avgPace)
                        const displaySpeed = unitSystem === 'imperial' ? speed * 0.621371 : speed
                        const unit = unitSystem === 'imperial' ? 'mph' : 'km/h'
                        return `Avg Speed: ${formatSpeed(displaySpeed)} ${unit}`
                      })()
                    : (() => {
                        const displayPace = unitSystem === 'imperial' ? chartStats.avgPace * 1.609344 : chartStats.avgPace
                        const unit = unitSystem === 'imperial' ? 'min/mi' : 'min/km'
                        return `Avg Pace: ${formatPace(displayPace)} ${unit}`
                      })()
                  }
                </span>
              )}
              {metricVisibility.heartRate && chartStats.avgHeartRate > 0 && (
                <span>Avg HR: <strong>{Math.round(chartStats.avgHeartRate)} bpm</strong></span>
              )}
            </div>
          )}
        </div>

        {/* Metric toggles */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleMetric('elevation')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              metricVisibility.elevation
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`w-3 h-3 rounded ${metricVisibility.elevation ? 'bg-green-300' : 'bg-green-500'}`} />
            Elevation
          </button>

          <button
            onClick={() => toggleMetric('pace')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              metricVisibility.pace
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`w-3 h-3 rounded ${metricVisibility.pace ? 'bg-blue-300' : 'bg-blue-500'}`} />
            {activityType === 'bike' ? 'Speed' : 'Pace'}
          </button>

          {paceHeartRateSettings?.includeHeartRate && (
            <button
              onClick={() => toggleMetric('heartRate')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                metricVisibility.heartRate
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-3 h-3 rounded ${metricVisibility.heartRate ? 'bg-red-300' : 'bg-red-500'}`} />
              Heart Rate
            </button>
          )}
        </div>
      </div>

      {/* Combined Chart */}
      <div className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={transformedChartData}
              onMouseMove={handleChartMouseMove}
              margin={{ top: 20, right: 80, bottom: 20, left: 20 }}
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