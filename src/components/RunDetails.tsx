'use client'

import { useState, useEffect } from 'react'
import { apiClient, handleApiResponse } from '@/lib/apiClient'
import { downloadFile } from '@/utils/fileGeneration'
import { useToast } from '@/hooks/useToast'
import Toast from '@/components/Toast'
import type { RouteData, PaceHeartRateSettings } from '@/types'

interface RunDetailsProps {
  routeData: RouteData
  chartData?: any[] // From the interactive charts
  activityType: 'run' | 'bike'
  paceHeartRateSettings?: PaceHeartRateSettings
  onSaveRoute?: () => void
  onRunDetailsChange?: (runName: string, description: string, date: string, startTime: string) => void
  isSaving?: boolean
  initialName?: string
  initialDescription?: string
  initialDate?: string
  initialStartTime?: string
  isAuthenticated?: boolean
}

export default function RunDetails({ 
  routeData, 
  chartData, 
  activityType, 
  paceHeartRateSettings, 
  onSaveRoute, 
  onRunDetailsChange, 
  isSaving = false,
  initialName = '',
  initialDescription = '',
  initialDate = new Date().toISOString().split('T')[0],
  initialStartTime = '12:00',
  isAuthenticated = false
}: RunDetailsProps) {
  const [runName, setRunName] = useState(initialName)
  const [runDate, setRunDate] = useState(initialDate)
  const [startTime, setStartTime] = useState(initialStartTime)
  const [description, setDescription] = useState(initialDescription)
  const [fileFormat, setFileFormat] = useState<'gpx' | 'tcx' | 'both'>('gpx')
  const [isGenerating, setIsGenerating] = useState(false)
  
  const { toast, showSuccess, showError, hideToast } = useToast()

  // Update state when initial props change (for loading saved routes)
  useEffect(() => {
    setRunName(initialName)
    setRunDate(initialDate)
    setStartTime(initialStartTime)
    setDescription(initialDescription)
  }, [initialName, initialDescription, initialDate, initialStartTime])

  // Notify parent component when run details change
  const handleRunNameChange = (value: string) => {
    setRunName(value)
    onRunDetailsChange?.(value, description, runDate, startTime)
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    onRunDetailsChange?.(runName, value, runDate, startTime)
  }
  
  const handleDateChange = (value: string) => {
    setRunDate(value)
    onRunDetailsChange?.(runName, description, value, startTime)
  }
  
  const handleStartTimeChange = (value: string) => {
    setStartTime(value)
    onRunDetailsChange?.(runName, description, runDate, value)
  }
  const includeHeartRate = paceHeartRateSettings?.includeHeartRate || false

  const handleDownload = async () => {
    if (routeData.points.length < 2) {
      showError('Please create a route first!')
      return
    }

    setIsGenerating(true)

    try {
      const request = {
        routeData,
        options: {
          name: runName || 'My Route',
          date: runDate,
          startTime,
          description,
          includeHeartRate,
          activityType
        },
        chartData,
        format: fileFormat as 'gpx' | 'tcx' | 'both'
      }

      const response = await apiClient.generateFiles(request)
      
      handleApiResponse(
        response,
        (data) => {
          // Download each generated file
          data.files.forEach(file => {
            downloadFile(file.content, file.name, file.mimeType)
          })
          
          // Show success message with details
          const fileCount = data.files.length
          const fileTypes = data.files.map(f => f.name.split('.').pop()?.toUpperCase()).join(', ')
          showSuccess(`Successfully generated ${fileCount} file${fileCount > 1 ? 's' : ''}: ${fileTypes} 🚀`)
        },
        (error) => {
          console.error('File generation failed:', error)
          
          if (error.code === 'RATE_LIMIT_EXCEEDED') {
            showError('Too many file generation requests. Please wait a minute before trying again.')
          } else if (error.code === 'ROUTE_TOO_COMPLEX') {
            showError('Route is too complex. Please reduce the number of points (max 1000).')
          } else if (error.code === 'ROUTE_TOO_LONG') {
            showError('Route is too long. Maximum distance is 1000km.')
          } else {
            showError(error.error || 'File generation failed. Please try again.')
          }
        }
      )
      
    } catch (error) {
      console.error('Unexpected error:', error)
      showError('An unexpected error occurred. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {activityType === 'run' ? 'Run' : 'Ride'} Details
      </h3>
      
      <div className="space-y-4">
        {/* Run Name */}
        <div>
          <label htmlFor="runName" className="block text-sm font-medium text-gray-700 mb-1">
            {activityType === 'run' ? 'Run' : 'Ride'} Name
          </label>
          <input
            type="text"
            id="runName"
            value={runName}
            onChange={(e) => handleRunNameChange(e.target.value)}
            placeholder={activityType === 'run' ? 'My Morning Run' : 'My Evening Ride'}
            className="input"
          />
        </div>

        {/* Date */}
        <div>
          <label htmlFor="runDate" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <div className="relative">
            <input
              type="date"
              id="runDate"
              value={runDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="input"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formatDate(runDate)}
            </div>
          </div>
        </div>

        {/* Start Time */}
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input
            type="time"
            id="startTime"
            value={startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            className="input"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={3}
            placeholder={activityType === 'run' ? 'A beautiful morning run through the park...' : 'An amazing cycling adventure through scenic routes...'}
            className="input resize-none"
          />
        </div>

        {/* File Format */}
        <div>
          <label htmlFor="fileFormat" className="block text-sm font-medium text-gray-700 mb-1">
            File Format
          </label>
          <select
            id="fileFormat"
            value={fileFormat}
            onChange={(e) => setFileFormat(e.target.value as 'gpx' | 'tcx' | 'both')}
            className="input"
          >
            <option value="gpx">GPX only</option>
            <option value="tcx">TCX only</option>
            <option value="both">Both GPX & TCX</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {fileFormat === 'gpx' && 'GPX: Compatible with most GPS devices and apps'}
            {fileFormat === 'tcx' && 'TCX: Training Center XML with advanced data'}
            {fileFormat === 'both' && 'Downloads both formats'}
          </div>
        </div>

        {/* Download & Save Section */}
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4">Actions</h4>
          
          <div className="grid gap-3">
            {/* Download Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-blue-900">
                      {fileFormat === 'gpx' && 'GPX File'}
                      {fileFormat === 'tcx' && 'TCX File'}
                      {fileFormat === 'both' && 'GPX + TCX Files'}
                    </div>
                    <div className="text-xs text-blue-700">
                      {fileFormat === 'both' ? 'Multiple files ready' : 'Single file download'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={routeData.points.length < 2 || isGenerating}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
                    routeData.points.length >= 2 && !isGenerating
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
            
            {/* Save Route Section */}
            {onSaveRoute && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-green-900">
                        Save Route
                      </div>
                      <div className="text-xs text-green-700">
                        {isAuthenticated ? 'Add to your collection' : 'Please log in to save routes'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onSaveRoute}
                    disabled={routeData.points.length < 2 || isSaving || !isAuthenticated}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
                      routeData.points.length >= 2 && !isSaving && isAuthenticated
                        ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg transform hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={!isAuthenticated ? 'Please log in to save routes' : (routeData.points.length < 2 ? 'Create a route first' : '')}
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>{!isAuthenticated ? 'Login Required' : 'Save Route'}</span>
                      </div>
                    )}
                  </button>
                </div>
                {!isAuthenticated && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-yellow-800 font-medium">Authentication Required</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Please{' '}
                      <a href="/login" className="underline hover:no-underline">
                        log in
                      </a>{' '}
                      or{' '}
                      <a href="/register" className="underline hover:no-underline">
                        register
                      </a>{' '}
                      to save your routes and access them later.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
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