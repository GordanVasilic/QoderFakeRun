'use client'

import { useState, useEffect } from 'react'
import { useSavedRoutesStore } from '@/store/savedRoutesStore'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import type { RouteData, ChartDataPoint, PaceHeartRateSettings } from '@/types'

interface SaveRouteModalProps {
  isOpen: boolean
  onClose: () => void
  routeData: RouteData
  chartData?: ChartDataPoint[]
  activityType: 'run' | 'bike'
  paceHeartRateSettings?: PaceHeartRateSettings
  initialName?: string
  initialDescription?: string
  initialDate?: string
  initialStartTime?: string
}

function SaveRouteModal({ 
  isOpen, 
  onClose, 
  routeData, 
  chartData, 
  activityType,
  paceHeartRateSettings,
  initialName,
  initialDescription,
  initialDate,
  initialStartTime
}: SaveRouteModalProps) {
  const { saveRoute, isLoading, error } = useSavedRoutesStore()
  const { isAuthenticated, user } = useAuthStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Generate Strava-style default name
  const generateDefaultName = () => {
    const today = new Date()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const activityLabel = activityType === 'bike' ? 'Ride' : 'Run'
    const dateStr = `${months[today.getMonth()]} ${today.getDate()}`
    
    return `My${activityLabel} ${dateStr}`
  }

  // Initialize with provided values or defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName || generateDefaultName())
      setDescription(initialDescription || '')
    }
    
    // Check authentication status
    if (isOpen && !isAuthenticated) {
      setShowLoginPrompt(true)
    } else {
      setShowLoginPrompt(false)
    }
  }, [isOpen, activityType, isAuthenticated, initialName, initialDescription])

  const handleSave = async () => {
    if (!routeData.points || routeData.points.length < 2) {
      return
    }
    
    // If not authenticated, show login prompt
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    setIsSaving(true)
    
    try {
      // Include paceHeartRateSettings in the routeData when saving
      const routeDataWithSettings = {
        ...routeData,
        activityType,
        paceHeartRateSettings: paceHeartRateSettings
      }
      
      const savedRoute = await saveRoute(
        routeDataWithSettings,
        chartData,
        activityType,
        name.trim() || generateDefaultName(),
        description.trim(),
        initialDate || new Date().toISOString().split('T')[0],
        initialStartTime || '12:00',
        paceHeartRateSettings
      )

      if (savedRoute) {
        toast.success('Route saved successfully!')
        // Success - close modal and reset form
        setName('')
        setDescription('')
        onClose()
      }
    } catch (error) {
      console.error('Failed to save route:', error)
      toast.error('Failed to save route')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setName('')
      setDescription('')
      setShowLoginPrompt(false)
      onClose()
    }
  }



  if (!isOpen) {
    return null;
  }

  // Show login prompt if not authenticated
  if (showLoginPrompt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Authentication Required</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800">To save routes, please log in or create an account.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <a 
                href="/login?returnUrl=/" 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Log In
              </a>
              <a 
                href="/register?returnUrl=/" 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center"
              >
                Create Account
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Save Route</h2>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Route Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{activityType === 'bike' ? '🚴' : '🏃'}</span>
                <span className="text-sm font-medium text-gray-700">
                  {activityType === 'bike' ? 'Bike Route' : 'Running Route'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Distance:</span>
                  <br />
                  {routeData.distance?.toFixed(2)} km
                </div>
                <div>
                  <span className="font-medium">Points:</span>
                  <br />
                  {routeData.points?.length || 0}
                </div>
                {/* Heart Rate Info */}
                {chartData && chartData.some(p => p.heartRate && p.heartRate > 0) && (
                  <div className="col-span-2">
                    <span className="font-medium text-red-600">❤️ Heart Rate:</span>
                    <br />
                    <span className="text-xs">Included ({chartData.filter(p => p.heartRate && p.heartRate > 0).length} points)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Route Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={generateDefaultName()}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                maxLength={100}
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your route..."
                disabled={isSaving}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {description.length}/500 characters
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !routeData.points || routeData.points.length < 2}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSaving ? 'Saving...' : 'Save Route'}
            </button>
          </div>
        </div>
      </div>
  )
}

export default SaveRouteModal