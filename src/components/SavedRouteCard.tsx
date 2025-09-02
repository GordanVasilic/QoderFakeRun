'use client'

import React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSavedRoutesStore } from '@/store/savedRoutesStore'
import type { SavedRoute } from '@/store/savedRoutesStore'
import { MapPin, Clock, Heart, TrendingUp, Mountain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import RouteStaticImage from '@/components/RouteStaticImage'
import { formatDistance, formatDuration, formatPace } from '@/lib/utils'
import type { RouteData } from '@/types'

interface SavedRouteCardProps {
  route: SavedRoute
  viewMode: 'list' | 'grid'
  onLoad?: (route: SavedRoute) => void
}

export default function SavedRouteCard({ route, viewMode, onLoad }: SavedRouteCardProps) {
  const router = useRouter()
  const { deleteRoute } = useSavedRoutesStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState<'gpx' | 'tcx' | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const handleLoad = () => {
    // Always use the onLoad prop if provided to avoid navigation conflicts
    if (onLoad) {
      onLoad(route)
    } else {
      // Fallback: Store route data and navigate (should not happen in normal flow)
      console.warn('SavedRouteCard: No onLoad prop provided, using fallback navigation')
      const dataToStore = {
        routeData: route.routeData,
        chartData: route.chartData || [],
        activityType: route.activityType,
        name: route.name,
        description: route.description,
        date: route.date,
        startTime: route.startTime
      }
      
      sessionStorage.setItem('loadRouteData', JSON.stringify(dataToStore))
      
      // Use setTimeout to avoid race condition with sessionStorage
      setTimeout(() => {
        router.push('/')
      }, 0)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await deleteRoute(route.id)
    setIsDeleting(false)
    setShowDeleteConfirm(false)
  }

  const handleDownload = async (format: 'gpx' | 'tcx') => {
    setIsDownloading(format)
    try {
      const response = await fetch(`/api/routes/${route.id}/download?format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${route.name.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(null)
    }
  }

  if (viewMode === 'grid') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
        {/* Map Preview */}
        <div className="h-[180px]">
          <RouteStaticImage route={route} className="w-full h-full rounded-t-xl" width={300} height={180} />
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{route.name}</h3>
              <p className="text-sm text-gray-500">{formatDate(route.createdAt)}</p>
            </div>
            <div className="ml-2 flex items-center gap-1">
              <span className="text-lg">{route.activityType === 'bike' ? '🚴' : '🏃'}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 mb-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="w-3 h-3" />
                <span className="font-medium">{route.stats.distance.toFixed(2)}</span> km
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-3 h-3" />
                {route.stats.duration > 0 && (
                  <span className="font-medium">{formatDuration(route.stats.duration)}</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {route.stats.averagePace && (
                <div className="flex items-center gap-1 text-gray-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-medium">{formatPace(route.stats.averagePace)}</span>
                </div>
              )}
              {route.stats.elevationGain > 0 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Mountain className="w-3 h-3" />
                  <span className="font-medium">{Math.round(route.stats.elevationGain)}</span>m
                </div>
              )}
            </div>
            
            {(route.stats.averageHeartRate || route.stats.difficulty) && (
              <div className="grid grid-cols-2 gap-2">
                {route.stats.averageHeartRate && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Heart className="w-3 h-3" />
                    <span className="font-medium">{route.stats.averageHeartRate}</span> bpm
                  </div>
                )}
                {route.stats.difficulty && (
                  <div className="text-gray-600">
                    <Badge variant="outline" className="text-xs">
                      {route.stats.difficulty.toLowerCase()}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description - minimal space for 2 lines */}
          <div className="mb-2 flex-1 min-h-[2rem]">
            {route.description && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-tight">{route.description}</p>
            )}
          </div>

          {/* Actions - always at bottom */}
          <div className="flex items-center gap-2 mt-auto">
            <button
              onClick={handleLoad}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Load
            </button>
            
            {/* Download Dropdown */}
            <div className="relative group">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 bottom-full mb-1 w-24 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => handleDownload('gpx')}
                  disabled={isDownloading === 'gpx'}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg disabled:opacity-50 cursor-pointer"
                >
                  {isDownloading === 'gpx' ? '...' : 'GPX'}
                </button>
                <button
                  onClick={() => handleDownload('tcx')}
                  disabled={isDownloading === 'tcx'}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg disabled:opacity-50 cursor-pointer"
                >
                  {isDownloading === 'tcx' ? '...' : 'TCX'}
                </button>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Route</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{route.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-4">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Route Info - Left Column */}
        <div className="col-span-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{route.name}</h3>
              <p className="text-sm text-gray-500">{formatDate(route.createdAt)}</p>
            </div>
          </div>
          
          {route.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{route.description}</p>
          )}
          
          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span><strong>{route.stats.distance.toFixed(2)}</strong> km</span>
            </div>
            {route.stats.duration > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span><strong>{formatDuration(route.stats.duration)}</strong></span>
              </div>
            )}
            {route.stats.averagePace && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span><strong>{formatPace(route.stats.averagePace)}</strong></span>
              </div>
            )}
            {route.stats.elevationGain > 0 && (
              <div className="flex items-center gap-1">
                <Mountain className="w-3 h-3" />
                <span><strong>{Math.round(route.stats.elevationGain)}</strong>m</span>
              </div>
            )}
            {route.stats.averageHeartRate && (
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span><strong>{route.stats.averageHeartRate}</strong> bpm</span>
              </div>
            )}
            {route.stats.difficulty && (
              <Badge variant="outline" className="text-xs">
                {route.stats.difficulty.toLowerCase()}
              </Badge>
            )}
            <span><strong>{route.stats.pointCount}</strong> points</span>
          </div>
        </div>
        
        {/* Route Preview Map - Center Column */}
        <div className="col-span-3 flex items-center justify-center">
          <div className="w-full h-20">
            <RouteStaticImage route={route} className="w-full h-full rounded-md" width={200} height={80} />
          </div>
        </div>

        {/* Actions - Right Column */}
        <div className="col-span-4 flex items-center justify-end gap-2">
          <button
            onClick={handleLoad}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Load Route
          </button>
          
          {/* Download Buttons */}
          <button
            onClick={() => handleDownload('gpx')}
            disabled={isDownloading === 'gpx'}
            className="px-3 py-2 text-gray-600 bg-gray-100 text-sm rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDownloading === 'gpx' ? '...' : 'GPX'}
          </button>
          
          <button
            onClick={() => handleDownload('tcx')}
            disabled={isDownloading === 'tcx'}
            className="px-3 py-2 text-gray-600 bg-gray-100 text-sm rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDownloading === 'tcx' ? '...' : 'TCX'}
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Route</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{route.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}