'use client';

import { useRouter } from 'next/navigation';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function TokenPurchaseCancel() {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-6">
          Your token purchase was cancelled. No charges were made to your account.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={handleGoBack}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Try Again
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}