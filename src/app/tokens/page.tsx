'use client'

import { useEffect, useState } from 'react'
import { useTokenStore } from '@/store/tokenStore'
import { useAuthStore } from '@/store/authStore'
import { useRouter, useSearchParams } from 'next/navigation'

export default function TokensPage() {
  const { packages, fetchPackages, selectPackage, selectedPackage, purchaseTokens, isLoading, error, checkoutUrl } = useTokenStore()
  const { isAuthenticated, user, tokenBalance, anonymousId, anonymousTokenBalance } = useAuthStore()
  const [pageState, setPageState] = useState<'select' | 'processing' | 'success' | 'error'>('select')
  const [transactionId, setTransactionId] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get query parameters for status checking
  const sessionId = searchParams.get('session_id')
  const paymentId = searchParams.get('payment_id')
  
  useEffect(() => {
    // Fetch token packages on component mount
    fetchPackages()
    
    // Check payment status if coming from checkout
    if (sessionId && paymentId) {
      setPageState('processing')
      setTransactionId(paymentId)
      
      // Check payment status
      const checkStatus = async () => {
        const status = await useTokenStore.getState().checkPaymentStatus(paymentId)
        
        if (status === 'COMPLETED') {
          setPageState('success')
          
          // Update token balance
          await useAuthStore.getState().updateTokenBalance()
        } else if (status === 'FAILED' || status === 'ERROR') {
          setPageState('error')
        }
      }
      
      checkStatus()
    }
  }, [fetchPackages, sessionId, paymentId])
  
  const handlePackageSelect = (packageId: string) => {
    selectPackage(packageId)
  }
  
  const handlePurchase = async () => {
    if (!selectedPackage) return
    
    // Create success/cancel URLs
    const successUrl = `${window.location.origin}/tokens`
    const cancelUrl = `${window.location.origin}/tokens?canceled=true`
    
    const url = await purchaseTokens(successUrl, cancelUrl)
    
    if (url) {
      // Redirect to checkout
      window.location.href = url
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
                Current Balance: <span className="text-blue-600">{isAuthenticated ? tokenBalance : anonymousTokenBalance} tokens</span>
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
                    <p className="text-blue-700">
                      {isAuthenticated
                        ? `${tokenBalance} tokens`
                        : anonymousId
                          ? `${anonymousTokenBalance} tokens (Anonymous)`
                          : 'No tokens (Anonymous)'}
                    </p>
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
                
                {!isAuthenticated && (
                  <p className="text-sm text-blue-600 mt-2">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Anonymous tokens will expire after 30 days. Create an account to keep them permanently.
                  </p>
                )}
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