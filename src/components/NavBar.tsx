'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { usePathname } from 'next/navigation'
import TokenBalance from './TokenBalance'

export default function NavBar() {
  const { isAuthenticated, user, logout, checkAuth } = useAuthStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const pathname = usePathname()
  
  // Initialize authentication state on component mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // Close dropdowns when clicking elsewhere
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isMenuOpen || isProfileOpen) {
        setIsMenuOpen(false)
        setIsProfileOpen(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMenuOpen, isProfileOpen])
  
  // Handle logout
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    logout()
    setIsProfileOpen(false)
  }
  
  // Toggle mobile menu
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMenuOpen(!isMenuOpen)
    if (isProfileOpen) setIsProfileOpen(false)
  }
  
  // Toggle profile dropdown
  const toggleProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProfileOpen(!isProfileOpen)
    if (isMenuOpen) setIsMenuOpen(false)
  }
  
  // Hide navbar on specific pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {
    return null
  }
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                FakeMyRide
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/' 
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Create Route
              </Link>
              {isAuthenticated && (
                <Link
                  href="/saved-routes"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === '/saved-routes' 
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Saved Routes
                </Link>
              )}

            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <div className="ml-3 relative">
                <div>
                  <button
                    onClick={toggleProfile}
                    className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 items-center"
                  >
                    <div className="mr-2">
                      <TokenBalance size="sm" />
                    </div>
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                      {user?.firstName ? user.firstName[0] : (user?.username ? user.username[0] : user?.email[0])}
                    </div>
                  </button>
                </div>
                {isProfileOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user?.username || user?.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Your Profile
                    </Link>
                    <Link
                      href="/tokens"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Tokens:</span>
                        <TokenBalance size="sm" showLabel={false} />
                      </div>
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={handleLogout}
                    >
                      Sign out
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <TokenBalance size="sm" />
                </div>
                <div className="flex space-x-2" style={{display: 'none'}}>
                  <Link
                    href="/login"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Register
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              pathname === '/' 
                ? 'border-blue-500 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Create Route
          </Link>
          {isAuthenticated && (
            <Link
              href="/saved-routes"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname === '/saved-routes' 
                  ? 'border-blue-500 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Saved Routes
            </Link>
          )}

        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          {isAuthenticated ? (
            <>
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                    {user?.firstName ? user.firstName[0] : (user?.username ? user.username[0] : user?.email[0])}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.username || user?.email}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    {user?.email}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Your Profile
                </Link>
                <Link
                  href="/tokens"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center space-x-2">
                    <span>Tokens:</span>
                    <TokenBalance size="md" showLabel={false} />
                  </div>
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                <a
                  href="#"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={handleLogout}
                >
                  Sign out
                </a>
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">Your Balance:</span>
                  <TokenBalance size="sm" />
                </div>
              </div>
              <div className="flex items-center justify-around mt-3 space-y-1 px-2" style={{display: 'none'}}>
                <Link
                  href="/login"
                  className="flex-1 mx-2 py-2 text-center border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="flex-1 mx-2 py-2 text-center border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}