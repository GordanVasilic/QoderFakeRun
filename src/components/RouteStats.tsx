'use client'

import { formatPace, convertPaceForDisplay } from '@/utils/mapUtils'
import type { RouteData, PaceHeartRateSettings } from '@/types'
import { useState, useEffect } from 'react'
import PaceHeartRateSettingsComponent from './PaceHeartRateSettings'

interface RouteStatsProps {
  routeData: RouteData
  unitSystem: 'metric' | 'imperial'
  activityType: 'run' | 'bike'
  paceHeartRateSettings?: PaceHeartRateSettings
  onUnitSystemChange: (units: 'metric' | 'imperial') => void
  onActivityTypeChange: (activityType: 'run' | 'bike') => void
  onPaceHeartRateSettingsChange?: (settings: PaceHeartRateSettings) => void
}

export default function RouteStats({ 
  routeData, 
  unitSystem, 
  activityType,
  paceHeartRateSettings: loadedPaceHeartRateSettings,
  onUnitSystemChange, 
  onActivityTypeChange,
  onPaceHeartRateSettingsChange 
}: RouteStatsProps) {
  // Remove local selectedActivity state - now controlled by parent
  
  // Helper function to get default pace based on activity type
  const getDefaultPace = (actType: 'run' | 'bike'): number => {
    if (actType === 'bike') {
      return 60 / 25 // 25 km/h = 2.4 min/km
    }
    return 5.5 // Default running pace: 5:30 min/km
  }
  
  // Use loaded settings directly or create defaults
  const currentPaceHeartRateSettings = loadedPaceHeartRateSettings ? {
    // Use the actual loaded settings
    averagePace: loadedPaceHeartRateSettings.averagePace,
    paceInconsistency: loadedPaceHeartRateSettings.paceInconsistency,
    includeHeartRate: loadedPaceHeartRateSettings.includeHeartRate,
    averageHeartRate: loadedPaceHeartRateSettings.averageHeartRate,
    heartRateVariability: loadedPaceHeartRateSettings.heartRateVariability
  } : {
    // Use defaults based on activity type
    averagePace: getDefaultPace(activityType),
    paceInconsistency: 30,
    includeHeartRate: false,
    averageHeartRate: 150,
    heartRateVariability: 20
  }
  
  // Debug logging to trace settings flow
  console.log('📊 RouteStats: Component rendered with settings:', {
    hasLoadedSettings: !!loadedPaceHeartRateSettings,
    loadedSettings: loadedPaceHeartRateSettings,
    currentSettings: currentPaceHeartRateSettings,
    activityType
  })

  const handlePaceHeartRateSettingsChange = (settings: PaceHeartRateSettings) => {
    onPaceHeartRateSettingsChange?.(settings)
  }
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatDistance = (distance: number): string => {
    if (unitSystem === 'imperial') {
      return (distance * 0.621371).toFixed(2)
    }
    return distance.toFixed(2)
  }

  const getDistanceUnit = (): string => {
    return unitSystem === 'imperial' ? 'mi' : 'km'
  }

  const getPaceOrSpeedUnit = (): string => {
    const result = convertPaceForDisplay(5.5, activityType, unitSystem) // Use dummy pace for unit
    return result.unit
  }

  const formatPaceOrSpeedForUnit = (pace: number): string => {
    const result = convertPaceForDisplay(pace, activityType, unitSystem)
    return result.value
  }

  const getPaceOrSpeedLabel = (): string => {
    return activityType === 'bike' ? 'Avg Speed' : 'Avg Pace'
  }

  // Calculate consistent duration based on current pace settings
  const getConsistentDuration = (): number => {
    if (routeData.distance > 0 && currentPaceHeartRateSettings.averagePace > 0) {
      // Calculate duration based on current pace: distance (km) * pace (min/km) * 60 (sec/min)
      return routeData.distance * currentPaceHeartRateSettings.averagePace * 60
    }
    return routeData.duration
  }

  // Calculate actual pace from route data
  const getActualPace = (): number => {
    if (routeData.distance > 0 && routeData.duration > 0) {
      // Calculate pace: duration (sec) / 60 (sec/min) / distance (km) = min/km
      return (routeData.duration / 60) / routeData.distance
    }
    return currentPaceHeartRateSettings.averagePace
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-1.5 border-b border-gray-100">
        <h3 className="text-xs font-medium text-gray-500">
          Activity Stats
        </h3>
      </div>

      {/* Main Stats Grid */}
      <div className="p-6">        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Distance */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">📏</span>
              </div>
              <span className="text-sm font-medium text-orange-700">Distance</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              {formatDistance(routeData.distance)}
              <span className="text-sm font-normal text-orange-600 ml-1">{getDistanceUnit()}</span>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⏱️</span>
              </div>
              <span className="text-sm font-medium text-blue-700">Time</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
                {formatTime(routeData.duration || getConsistentDuration())}
              </div>
          </div>

          {/* Elevation Gain */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⛰️</span>
              </div>
              <span className="text-sm font-medium text-green-700">Elevation Gain</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {Math.round(routeData.elevationGain)}
              <span className="text-sm font-normal text-green-600 ml-1">m</span>
            </div>
          </div>

          {/* Average Pace/Speed */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">{activityType === 'bike' ? '🚴' : '🏃'}</span>
              </div>
              <span className="text-sm font-medium text-purple-700">{getPaceOrSpeedLabel()}</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {formatPaceOrSpeedForUnit(currentPaceHeartRateSettings.averagePace)}
              <span className="text-sm font-normal text-purple-600 ml-1">{getPaceOrSpeedUnit()}</span>
            </div>
          </div>
        </div>

        {/* Pace & Heart Rate Settings */}
        <PaceHeartRateSettingsComponent
          settings={currentPaceHeartRateSettings}
          unitSystem={unitSystem}
          activityType={activityType}
          onSettingsChange={handlePaceHeartRateSettingsChange}
        />
      </div>
    </div>
  )
}