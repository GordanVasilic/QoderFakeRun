'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { isAuthenticated, user, logout, checkAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  
  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)
      const isAuthed = await checkAuth()
      
      if (!isAuthed) {
        router.push('/login?returnUrl=/profile')
        return
      }
      
      if (user) {
        setFirstName(user.firstName || '')
        setLastName(user.lastName || '')
        setUsername(user.username || '')
      }
      
      setIsLoading(false)
    }
    
    loadProfile()
  }, [checkAuth, router, user])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setUpdating(true)
    setError('')
    setSuccess('')
    
    try {
      // Send API request to update profile
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          username
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || 'Failed to update profile')
        return
      }
      
      setSuccess('Profile updated successfully')
      
      // Update user in store
      await checkAuth()
    } catch (err) {
      setError('An error occurred while updating your profile')
    } finally {
      setUpdating(false)
    }
  }
  
  const handleLogout = () => {
    logout()
    router.push('/')
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <svg className="w-12 h-12 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-gray-600">Loading profile...</p>
      </div>
    )
  }
  
  if (!isAuthenticated || !user) {
    return null // This shouldn't happen, but just in case
  }
  
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left column - User info */}
            <div className="md:col-span-1">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  {user.avatar ? (
                    <img 
                      src={user.avatar as string} 
                      alt={`${user.firstName || user.username || 'User'}'s avatar`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-4xl text-gray-400">
                      {user.firstName ? user.firstName[0] : (user.username ? user.username[0] : 'U')}
                    </span>
                  )}
                </div>
                
                <h2 className="text-xl font-semibold">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.username || user.email}
                </h2>
                
                <p className="text-gray-500 text-sm mb-4">{user.email}</p>
                
                <div className="bg-blue-50 rounded-lg p-4 w-full">
                  <h3 className="text-md font-semibold text-blue-800 mb-2">Download Tokens</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-blue-700">{user.tokenBalance as React.ReactNode}</span>
                      <span className="text-sm text-blue-600 ml-1">tokens</span>
                    </div>
                    <a 
                      href="/tokens" 
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Buy More
                    </a>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="mt-6 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
            
            {/* Right column - Edit profile */}
            <div className="md:col-span-2">
              <h3 className="text-xl font-semibold mb-4">Edit Profile</h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={updating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={updating}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={updating}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={updating}
                  >
                    {updating && (
                      <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {updating ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Download History */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h3 className="text-xl font-semibold mb-4">Download History</h3>
          
          {/* We'd implement download history UI here */}
          <p className="text-gray-500">Your download history will be displayed here.</p>
        </div>
      </div>
    </div>
  )
}