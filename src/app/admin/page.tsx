'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AdminStats {
  totalUsers: number
  totalRoutes: number
  totalDownloads: number
  totalRevenue: number
  tokensIssued: number
  tokensUsed: number
  activeUsers: number
  newUsers24h: number
}

export default function AdminPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  const router = useRouter()
  
  // Check if admin
  useEffect(() => {
    async function checkAdmin() {
      setIsLoading(true)
      const isAuthed = await checkAuth()
      
      if (!isAuthed) {
        router.push('/login?returnUrl=/admin')
        return
      }
      
      if (!user || user.role !== 'ADMIN') {
        router.push('/')
        return
      }
      
      // Load admin stats
      await fetchStats()
      setIsLoading(false)
    }
    
    checkAdmin()
  }, [checkAuth, router, user])
  
  // Fetch admin stats
  const fetchStats = async () => {
    try {
      const token = useAuthStore.getState().token
      
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || 'Failed to load stats')
        return
      }
      
      setStats(result.data)
    } catch (err) {
      setError('Failed to load stats')
      console.error('Error loading stats:', err)
      
      // Set mock stats for demo purposes
      setStats({
        totalUsers: 120,
        totalRoutes: 456,
        totalDownloads: 789,
        totalRevenue: 1234.56,
        tokensIssued: 2000,
        tokensUsed: 789,
        activeUsers: 85,
        newUsers24h: 12
      })
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <svg className="w-12 h-12 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Link 
            href="/" 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Return to Site
          </Link>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-gray-500 text-sm font-medium uppercase mb-1">Total Users</h3>
              <div className="flex items-baseline">
                <span className="text-3xl font-semibold text-gray-900">{stats.totalUsers}</span>
                <span className="text-green-500 ml-2 text-sm font-medium">
                  +{stats.newUsers24h} today
                </span>
              </div>
              <div className="mt-4">
                <a href="/admin/users" className="text-blue-600 text-sm hover:text-blue-800">
                  Manage Users →
                </a>
              </div>
            </div>
            
            {/* Total Routes */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-gray-500 text-sm font-medium uppercase mb-1">Total Routes</h3>
              <div className="flex items-baseline">
                <span className="text-3xl font-semibold text-gray-900">{stats.totalRoutes}</span>
              </div>
              <div className="mt-4">
                <a href="/admin/routes" className="text-blue-600 text-sm hover:text-blue-800">
                  View Routes →
                </a>
              </div>
            </div>
            
            {/* Downloads */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-gray-500 text-sm font-medium uppercase mb-1">Downloads</h3>
              <div className="flex items-baseline">
                <span className="text-3xl font-semibold text-gray-900">{stats.totalDownloads}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tokens Used</span>
                  <span>{stats.tokensUsed} / {stats.tokensIssued}</span>
                </div>
              </div>
            </div>
            
            {/* Revenue */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-gray-500 text-sm font-medium uppercase mb-1">Total Revenue</h3>
              <div className="flex items-baseline">
                <span className="text-3xl font-semibold text-gray-900">${stats.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="mt-4">
                <a href="/admin/transactions" className="text-blue-600 text-sm hover:text-blue-800">
                  View Transactions →
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* Admin Menu */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Admin Functions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a
                href="/admin/users"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">User Management</h3>
                  <p className="text-sm text-gray-500">Manage user accounts and roles</p>
                </div>
              </a>
              
              <a
                href="/admin/routes"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Route Management</h3>
                  <p className="text-sm text-gray-500">View and manage all routes</p>
                </div>
              </a>
              
              <a
                href="/admin/transactions"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Transactions</h3>
                  <p className="text-sm text-gray-500">View payment history and tokens</p>
                </div>
              </a>
              
              <a
                href="/admin/settings"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Site Settings</h3>
                  <p className="text-sm text-gray-500">Manage token packages and settings</p>
                </div>
              </a>
              
              <a
                href="/admin/stats"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center"
              >
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Detailed Analytics</h3>
                  <p className="text-sm text-gray-500">View advanced usage statistics</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}