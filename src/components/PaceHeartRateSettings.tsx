'use client'

import { useState, useCallback } from 'react'
import { formatPace, convertPaceForDisplay } from '@/utils/mapUtils'
import type { PaceHeartRateSettings } from '@/types'

interface PaceHeartRateSettingsProps {
  settings: PaceHeartRateSettings
  unitSystem: 'metric' | 'imperial'
  activityType: 'run' | 'bike'
  onSettingsChange: (settings: PaceHeartRateSettings) => void
}

export default function PaceHeartRateSettings({ 
  settings, 
  unitSystem, 
  activityType,
  onSettingsChange 
}: PaceHeartRateSettingsProps) {
  // Debug logging to trace settings props
  console.log('🎛️ PaceHeartRateSettings: Component rendered with settings:', {
    averagePace: settings.averagePace,
    paceInconsistency: settings.paceInconsistency,
    includeHeartRate: settings.includeHeartRate,
    averageHeartRate: settings.averageHeartRate,
    heartRateVariability: settings.heartRateVariability,
    activityType,
    unitSystem,
    timestamp: new Date().toISOString()
  })
  
  // Additional debug: Check if settings are being used correctly
  console.log('🎛️ PaceHeartRateSettings: Settings validation:', {
    hasValidPace: typeof settings.averagePace === 'number' && settings.averagePace > 0,
    hasValidInconsistency: typeof settings.paceInconsistency === 'number',
    hasValidHeartRate: typeof settings.averageHeartRate === 'number',
    includeHeartRateFlag: settings.includeHeartRate,
    settingsObject: JSON.stringify(settings)
  })
  const handlePaceChange = useCallback((value: number) => {
    onSettingsChange({
      ...settings,
      averagePace: value
    })
  }, [settings, onSettingsChange])

  const handlePaceInconsistencyChange = useCallback((value: number) => {
    onSettingsChange({
      ...settings,
      paceInconsistency: value
    })
  }, [settings, onSettingsChange])

  const handleHeartRateToggle = useCallback((enabled: boolean) => {
    onSettingsChange({
      ...settings,
      includeHeartRate: enabled
    })
  }, [settings, onSettingsChange])

  const handleAverageHeartRateChange = useCallback((value: number) => {
    onSettingsChange({
      ...settings,
      averageHeartRate: value
    })
  }, [settings, onSettingsChange])

  const handleHeartRateVariabilityChange = useCallback((value: number) => {
    onSettingsChange({
      ...settings,
      heartRateVariability: value
    })
  }, [settings, onSettingsChange])

  const formatPaceOrSpeedForUnit = (pace: number): string => {
    const result = convertPaceForDisplay(pace, activityType, unitSystem)
    return result.value
  }

  const getPaceOrSpeedUnit = (): string => {
    const result = convertPaceForDisplay(5.5, activityType, unitSystem) // Use dummy pace for unit
    return result.unit
  }

  const getPaceOrSpeedLabel = (): string => {
    return activityType === 'bike' ? 'Average Speed' : 'Average Pace'
  }

  // Get slider properties based on activity type
  const getSliderProperties = () => {
    if (activityType === 'bike') {
      // For bikes: work directly with speed values (3-100 km/h)
      return {
        min: 3,         // 3 km/h (slowest)
        max: 100,       // 100 km/h (fastest)
        step: 0.5,      // 0.5 km/h steps
        defaultValue: 25, // 25 km/h default
        minLabel: '3 km/h',
        maxLabel: '100 km/h'
      }
    } else {
      // For running: pace range 3:00-8:00 min/km
      return {
        min: 3,
        max: 8,
        step: 0.1,
        defaultValue: 5.5,
        minLabel: '3:00',
        maxLabel: '8:00'
      }
    }
  }

  // Get current slider value based on activity type
  const getCurrentSliderValue = (): number => {
    if (activityType === 'bike') {
      // Convert stored pace to speed for display on slider
      return 60 / settings.averagePace // pace to speed conversion
    }
    return settings.averagePace // pace value directly
  }

  // Handle slider changes with proper conversion
  const handleSliderChange = (value: number) => {
    if (activityType === 'bike') {
      // Convert speed back to pace for storage
      const paceValue = 60 / value
      handlePaceChange(paceValue)
    } else {
      // Direct pace value
      handlePaceChange(value)
    }
  }

  const getPaceDescription = (inconsistency: number): string => {
    if (activityType === 'bike') {
      // Speed inconsistency descriptions for cycling
      if (inconsistency === 0) return 'Constant speed throughout the ride (most efficient)'
      if (inconsistency <= 10) return 'Very consistent speed with minimal variation'
      if (inconsistency <= 25) return 'Moderate speed changes (realistic for varied terrain)'
      if (inconsistency <= 50) return 'High speed variation (challenging workout style)'
      return 'Extreme speed changes (interval training style)'
    } else {
      // Pace inconsistency descriptions for running
      if (inconsistency === 0) return 'Constant pace throughout the run (most efficient)'
      if (inconsistency <= 10) return 'Very consistent pace with minimal variation'
      if (inconsistency <= 25) return 'Moderate pace changes (realistic for varied terrain)'
      if (inconsistency <= 50) return 'High pace variation (challenging workout style)'
      return 'Extreme pace changes (interval training style)'
    }
  }

  const getHeartRateIntensity = (heartRate: number): string => {
    if (heartRate < 120) return 'Low intensity, recovery effort'
    if (heartRate < 140) return 'Moderate intensity, aerobic base'
    if (heartRate < 160) return 'High intensity, vigorous effort'
    if (heartRate < 180) return 'Very high intensity, anaerobic threshold'
    return 'Maximum intensity, sprint effort'
  }

  const getHeartRateVariabilityDescription = (variability: number): string => {
    if (variability === 0) return 'Constant heart rate (unrealistic)'
    if (variability <= 10) return 'Minimal heart rate changes (very fit athlete)'
    if (variability <= 25) return 'Moderate heart rate changes (realistic for varied terrain)'
    if (variability <= 50) return 'High heart rate variation (challenging terrain/intervals)'
    return 'Extreme heart rate changes (very demanding workout)'
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
      <h4 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span>⚙️</span>
        Pace & Heart Rate Settings
      </h4>

      {/* Pace/Speed Unit Display */}
      <div className="text-xs text-gray-600 mb-3">
        <span className="font-medium">{activityType === 'bike' ? 'Speed' : 'Pace'} Unit:</span> {getPaceOrSpeedUnit()}
      </div>

      {/* Average Pace/Speed Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {activityType === 'bike' ? '🚴' : '🏃'} {getPaceOrSpeedLabel()} ({getPaceOrSpeedUnit()})
          </label>
          <span className="text-sm font-semibold text-orange-600">
            {formatPaceOrSpeedForUnit(settings.averagePace)}
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={getSliderProperties().min}
            max={getSliderProperties().max}
            step={getSliderProperties().step}
            value={getCurrentSliderValue()}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{getSliderProperties().minLabel}</span>
            <span>{getSliderProperties().maxLabel}</span>
          </div>
        </div>
      </div>

      {/* Pace Inconsistency Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            🔄 {activityType === 'bike' ? 'Speed' : 'Pace'} Inconsistency
          </label>
          <span className="text-sm font-semibold text-orange-600">
            {settings.paceInconsistency}%
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={settings.paceInconsistency}
            onChange={(e) => handlePaceInconsistencyChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {getPaceDescription(settings.paceInconsistency)}
        </p>
      </div>

      {/* Heart Rate Toggle */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            Include Heart Rate Data
          </label>
          <div 
            onClick={() => handleHeartRateToggle(!settings.includeHeartRate)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
              settings.includeHeartRate ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.includeHeartRate ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </div>
        </div>

        {settings.includeHeartRate && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Average Heart Rate Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  ❤️ Average Heart Rate
                </label>
                <span className="text-sm font-semibold text-red-600">
                  {settings.averageHeartRate} bpm
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="100"
                  max="200"
                  step="1"
                  value={settings.averageHeartRate}
                  onChange={(e) => handleAverageHeartRateChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-red"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>100</span>
                  <span>200</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {getHeartRateIntensity(settings.averageHeartRate)}
              </p>
            </div>

            {/* Heart Rate Variability Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  📊 Heart Rate Variability
                </label>
                <span className="text-sm font-semibold text-red-600">
                  {settings.heartRateVariability}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={settings.heartRateVariability}
                  onChange={(e) => handleHeartRateVariabilityChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-red"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {getHeartRateVariabilityDescription(settings.heartRateVariability)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}