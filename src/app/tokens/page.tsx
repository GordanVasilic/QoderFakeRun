'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter, useSearchParams } from 'next/navigation'
import TokenBalance from '@/components/TokenBalance'

function TokensContent() {
  const [packages] = useState([
    { id: '1', name: 'Starter', tokens: 5, price: 4.99 },
    { id: '2', name: 'Basic', tokens: 15, price: 12.99 },
    { id: '3', name: 'Pro', tokens: 50, price: 39.99 },
    { id: '4', name: 'Premium', tokens: 100, price: 69.99 }
  ])
  const [selectedPackage, setSelectedPackage] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuthStore()
  const [pageState, setPageState] = useState<'select' | 'processing' | 'success' | 'error'>('select')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get query parameters for status checking
  const sessionId = searchParams?.get('session_id')
  
  useEffect(() => {
    // Check payment status if coming from checkout
    if (sessionId) {
      setPageState('success')
      
      // Clear URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('session_id')
      url.searchParams.delete('payment_id')
      window.history.replaceState({}, '', url.toString())
    } else if (searchParams?.get('canceled') === 'true') {
      setPageState('error')
      
      // Clear URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('canceled')
      window.history.replaceState({}, '', url.toString())
    }
  }, [sessionId, searchParams])
  
  const handlePackageSelect = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId)
    setSelectedPackage(pkg)
  }
  
  const handlePurchase = async () => {
    if (!selectedPackage) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Create success/cancel URLs
      const successUrl = `${window.location.origin}/tokens?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${window.location.origin}/tokens?canceled=true`
      
      const response = await fetch('/api/tokens/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          successUrl,
          cancelUrl
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Purchase error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Render different states
  const renderContent = () => {
    switch (pageState) {
      case 'processing':
        return (
          <div className="text-center py-16">
            <svg className="w-16 h-16 animate-spin mx-auto text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <h2 className="text-2xl font-semibold mt-6">Processing Payment</h2>
            <p className="text-gray-600 mt-2">Please wait while we verify your payment...</p>
          </div>
        )
        
      case 'success':
        return (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mt-6">Payment Successful!</h2>
            <p className="text-gray-600 mt-2">Your tokens have been added to your account.</p>
            <div className="mt-6">
              <p className="text-lg font-semibold">
                Current Balance: <TokenBalance size="lg" className="text-blue-600" />
              </p>
            </div>
            <div className="mt-8">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-2"
              >
                Create Route
              </button>
              <button
                onClick={() => setPageState('select')}
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors mx-2"
              >
                Buy More Tokens
              </button>
            </div>
          </div>
        )
        
      case 'error':
        return (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mt-6">Payment Failed</h2>
            <p className="text-gray-600 mt-2">There was an issue with your payment. Please try again.</p>
            <div className="mt-8">
              <button
                onClick={() => setPageState('select')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )
        
      default:
        return (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">Purchase Download Tokens</h2>
              <p className="text-gray-600">
                Tokens are required to download generated routes. Each download costs 1 token.
              </p>
              
              {/* Current Balance */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800">Current Balance</h3>
                    <div className="text-blue-700">
                      <TokenBalance size="lg" />
                    </div>
                  </div>
                  
                  {!isAuthenticated && (
                    <a
                      href="/login?returnUrl=/tokens"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Log In
                    </a>
                  )}
                </div>
                
                <p className="text-sm text-blue-600 mt-2">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isAuthenticated 
                    ? 'Your tokens are safely stored in your account.'
                    : 'Anonymous tokens are stored locally. Link your email for backup protection.'}
                </p>
              </div>
            </div>
            
            {/* Package Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg.id)}
                  className={`border rounded-xl p-5 cursor-pointer transition-all ${
                    selectedPackage?.id === pkg.id 
                      ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{pkg.name}</h3>
                    {selectedPackage?.id === pkg.id && (
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  
                  <div className="flex items-baseline mb-2">
                    <span className="text-2xl font-bold">${pkg.price.toFixed(2)}</span>
                    <span className="text-gray-500 ml-2">USD</span>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg py-2 px-3 mb-4">
                    <span className="text-lg font-semibold">{pkg.tokens}</span> tokens
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {pkg.tokens === 1 ? '1 download' : `${pkg.tokens} downloads`}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Error message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {/* Purchase button */}
            <div className="mt-8">
              <button
                onClick={handlePurchase}
                disabled={!selectedPackage || isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading && (
                  <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isLoading ? 'Processing...' : `Purchase ${selectedPackage ? selectedPackage.name : 'Tokens'}`}
              </button>
            </div>
          </div>
        )
    }
  }
  
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Download Tokens</h1>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default function TokensPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TokensContent />
    </Suspense>
  )
}