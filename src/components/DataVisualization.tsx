'use client'

import { useMemo, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'
import { calculateDistance, formatPace } from '@/utils/mapUtils'
import type { RouteData, ChartDataPoint } from '@/types'

interface DataVisualizationProps {
  routeData: RouteData
}

export default function DataVisualization({ routeData }: DataVisualizationProps) {
  const [editMode, setEditMode] = useState<'pace' | 'heartRate' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activePoint, setActivePoint] = useState<number | null>(null)
  // Generate chart data from route points
  const chartData = useMemo(() => {
    if (routeData.points.length < 2) return []

    const data: ChartDataPoint[] = []
    let cumulativeDistance = 0

    for (let i = 0; i < routeData.points.length; i++) {
      if (i > 0) {
        // Calculate distance from previous point
        const prev = routeData.points[i - 1]
        const curr = routeData.points[i]
        const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
        cumulativeDistance += distance
      }

      data.push({
        distance: Number(cumulativeDistance.toFixed(2)),
        pace: routeData.averagePace + (Math.random() - 0.5) * 0.5, // Add some variation
        elevation: routeData.points[i].elevation || Math.random() * 100, // Mock elevation
        heartRate: 140 + Math.random() * 40, // Mock heart rate data
      })
    }

    return data
  }, [routeData])

  const maxElevation = Math.max(...chartData.map(d => d.elevation || 0))
  const totalElevationGain = chartData.reduce((total, point, index) => {
    if (index === 0) return 0
    const elevationDiff = (point.elevation || 0) - (chartData[index - 1].elevation || 0)
    return total + (elevationDiff > 0 ? elevationDiff : 0)
  }, 0)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Data Visualization</h3>
      
      {/* Pace Profile */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-md font-medium text-gray-900">Pace Profile</h4>
          <div className="text-sm text-gray-500">
            Average: {formatPace(routeData.averagePace)} min/km
          </div>
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="distance" 
                  stroke="#6b7280"
                  fontSize={12}
                  label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={formatPace}
                  label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatPace(value), 'Pace']}
                  labelFormatter={(label) => `Distance: ${label} km`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pace" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#1d4ed8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Preview - Draw a route to see real data</p>
          </div>
        )}
      </div>

      {/* Elevation Profile */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-md font-medium text-gray-900">Elevation Profile</h4>
          <div className="text-sm text-gray-500">
            Total Gain: {Math.round(totalElevationGain)}m
          </div>
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="distance" 
                  stroke="#6b7280"
                  fontSize={12}
                  label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${Math.round(value)}m`, 'Elevation']}
                  labelFormatter={(label) => `Distance: ${label} km`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="elevation" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="#10b981"
                  fillOpacity={0.1}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Preview - Draw a route to see real data</p>
          </div>
        )}
      </div>
    </div>
  )
}