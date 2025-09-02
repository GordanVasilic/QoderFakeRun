'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  username?: string
  firstName?: string
  lastName?: string
  tokenBalance: number
  role: string
  createdAt: string
  lastLoginAt?: string
}

export default function AdminUsersPage() {
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()
  
  // Check if admin
  useEffect(() => {
    async function checkAdmin() {
      setIsLoading(true)
      const isAuthed = await checkAuth()
      
      if (!isAuthed) {
        router.push('/login?returnUrl=/admin/users')
        return
      }
      
      if (!user || user.role !== 'ADMIN') {
        router.push('/')
        return
      }
      
      // Load users
      await fetchUsers()
      setIsLoading(false)
    }
    
    checkAdmin()
  }, [checkAuth, router, user])
  
  // Fetch users
  const fetchUsers = async () => {
    try {
      const token = useAuthStore.getState().token
      
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || 'Failed to load users')
        return
      }
      
      setUsers(result.data.users)
    } catch (err) {
      setError('Failed to load users')
      console.error('Error loading users:', err)
    }
  }
  
  // Add tokens to user
  const addTokens = async (userId: string, tokenCount: number) => {
    try {
      setError('')
      setSuccess('')
      
      const token = useAuthStore.getState().token
      
      const response = await fetch(`/api/admin/users/${userId}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tokens: tokenCount })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || 'Failed to add tokens')
        return
      }
      
      setSuccess(`Added ${tokenCount} tokens to user`)
      fetchUsers() // Refresh user list
    } catch (err) {
      setError('Failed to add tokens')
      console.error('Error adding tokens:', err)
    }
  }
  
  // Delete user
  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    
    try {
      setError('')
      setSuccess('')
      
      const token = useAuthStore.getState().token
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || 'Failed to delete user')
        return
      }
      
      setSuccess('User deleted successfully')
      fetchUsers() // Refresh user list
    } catch (err) {
      setError('Failed to delete user')
      console.error('Error deleting user:', err)
    }
  }
  
  // Promote/demote admin
  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    try {
      setError('')
      setSuccess('')
      
      const token = useAuthStore.getState().token
      
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: makeAdmin ? 'ADMIN' : 'USER' })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || `Failed to ${makeAdmin ? 'promote' : 'demote'} user`)
        return
      }
      
      setSuccess(`User ${makeAdmin ? 'promoted to admin' : 'demoted to user'}`)
      fetchUsers() // Refresh user list
    } catch (err) {
      setError(`Failed to ${makeAdmin ? 'promote' : 'demote'} user`)
      console.error('Error updating user role:', err)
    }
  }
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <svg className="w-12 h-12 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-gray-600">Loading users...</p>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">User Management</h1>
          <a 
            href="/admin" 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Admin
          </a>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {user.firstName ? (
                          <span className="text-lg font-medium text-gray-500">
                            {user.firstName[0]}
                          </span>
                        ) : (
                          <span className="text-lg font-medium text-gray-500">
                            {user.username ? user.username[0] : user.email[0]}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || 'Unnamed User'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.tokenBalance}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.lastLoginAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => addTokens(user.id, 5)}
                      className="text-blue-600 hover:text-blue-900 mx-2"
                    >
                      Add 5 Tokens
                    </button>
                    <button 
                      onClick={() => toggleAdmin(user.id, user.role !== 'ADMIN')}
                      className={`${user.role === 'ADMIN' ? 'text-orange-600 hover:text-orange-900' : 'text-purple-600 hover:text-purple-900'} mx-2`}
                    >
                      {user.role === 'ADMIN' ? 'Demote' : 'Make Admin'}
                    </button>
                    <button 
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 mx-2"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}