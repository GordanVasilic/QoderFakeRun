'use client'

import React from 'react'
import TokenRedemption from '@/components/TokenRedemption'

export default function TestTokenPage() {
  const handleRedeem = () => {
    console.log('Test redeem called!')
    alert('Test redeem successful!')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">Test Token Redemption</h1>
      
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Test 1: Direct Download Mode</h2>
          <TokenRedemption
            downloadUrl="/test-file.txt"
            fileName="test-file.txt"
            tokensRequired={5}
            action="download"
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Test 2: Custom Action Mode</h2>
          <TokenRedemption
            cost={3}
            action="unlock feature"
            onRedeem={handleRedeem}
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Test 3: Processing State</h2>
          <TokenRedemption
            cost={2}
            action="process"
            onRedeem={handleRedeem}
            isProcessing={true}
            processingText="Processing your request..."
          />
        </div>
      </div>
    </div>
  )
}