/**
 * Token Balance Component - Displays user's current token balance
 * with purchase and management options
 */

import React, { useState, useEffect } from 'react';
import { Coins, Plus, Mail, RefreshCw, ExternalLink, X, Check, Star } from 'lucide-react';
import { useTokenStore } from '@/store/tokenStore';
import { toast } from 'sonner';
import { tokenService } from '@/lib/tokens';

// Helper function to format price
const formatPrice = (price: number): string => {
  return `$${(price / 100).toFixed(2)}`;
};

// Helper function to calculate price per token
const getPricePerToken = (pkg: { price: number; tokens: number }): string => {
  const pricePerToken = (pkg.price / 100) / pkg.tokens;
  return `$${pricePerToken.toFixed(2)} per token`;
};

// Types
interface TokenWallet {
  balance: number;
  email_linked: boolean;
  last_purchase: string | null;
}

import { StripeCheckout } from './StripeCheckout';
import { useAuthStore } from '@/store/authStore';


interface TokenBalanceProps {
  className?: string;
  showPurchaseButton?: boolean;
  showEmailLink?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TokenBalance: React.FC<TokenBalanceProps> = ({
  className = '',
  showPurchaseButton = true,
  showEmailLink = false,
  size = 'md',
  showLabel = true
}) => {
  // Use authStore for token balance
  const { isAuthenticated, tokenBalance, anonymousTokenBalance, updateTokenBalance, user } = useAuthStore();
  
  // Use token packages from service
  const packages = tokenService.getTokenPackages();
  
  const [wallet, setWallet] = useState<TokenWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [showPackages, setShowPackages] = useState(false);
  const [email, setEmail] = useState('');
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  // Get current token balance from authStore
  const currentBalance = isAuthenticated ? tokenBalance : anonymousTokenBalance;
  
  console.log('🔍 [TokenBalance] Current balance state:', {
    isAuthenticated,
    tokenBalance,
    anonymousTokenBalance,
    currentBalance,
    persistedData: typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null
  });


  useEffect(() => {
    loadWallet();
    // Always fetch fresh balance on component mount to avoid stale cached data
    updateTokenBalance().catch(console.error);
  }, []);
  
  // Listen for changes in token balance from authStore
  useEffect(() => {
    // Always update wallet balance when currentBalance changes, even if wallet isn't fully loaded yet
    setWallet(prev => prev ? { ...prev, balance: currentBalance } : {
      balance: currentBalance,
      email_linked: !!user?.email,
      last_purchase: null
    });
  }, [currentBalance, user?.email]);

  const loadWallet = async () => {
    console.log('🔄 [TokenBalance] loadWallet called');
    setLoading(true);
    setError(null);
    
    try {
      // For anonymous users, ensure we have an anonymous ID before proceeding
      if (!isAuthenticated) {
        const { ensureAnonymousId } = await import('@/store/authStore');
        const anonymousId = ensureAnonymousId();
        console.log('🔄 [TokenBalance] Ensured anonymous ID:', anonymousId);
      }
      
      // Always fetch from server first on initial load to get the correct balance
      console.log('🔄 [TokenBalance] Calling updateTokenBalance to get fresh balance...');
      const freshBalance = await updateTokenBalance();
      console.log('✅ [TokenBalance] updateTokenBalance completed successfully, fresh balance:', freshBalance);
      
      // Use the fresh balance directly from the API call, not from the store
      console.log('📊 [TokenBalance] Using fresh balance from API:', freshBalance);
      
      // Set wallet with the fresh balance from API
      setWallet({
        balance: freshBalance,
        email_linked: !!user?.email,
        last_purchase: null
      });
      
      console.log('✅ [TokenBalance] Wallet loaded successfully with server balance');
      
      // Token packages are now static from service
    } catch (error: Error | unknown) {
      console.error('❌ [TokenBalance] Failed to load wallet:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = 'Failed to load wallet';
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('aborted'))) {
        errorMessage = 'Wallet loading timed out. Please try again.';
      } else if (error instanceof Error && error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to wallet service. Please check your connection and try again.';
      } else if (error instanceof Error && error.message.includes('Anonymous ID not available')) {
        errorMessage = 'Session error. Please refresh the page.';
      } else {
        errorMessage = `Failed to load wallet: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
      }
      
      setError(errorMessage);
      
      // Set fallback wallet data
      const currentBalance = user ? tokenBalance : anonymousTokenBalance;
      setWallet({ balance: currentBalance, email_linked: false, last_purchase: null });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (packageId: string) => {
    // Purchase logic will be handled by StripeCheckout component
    console.log('Purchasing package:', packageId);
  };

  const handlePaymentSuccess = async (tokens: number) => {
    try {
      // Update token balance from authStore (this will fetch from API)
      const freshBalance = await updateTokenBalance();
      
      // Update local wallet state with the fresh balance from API
      if (wallet) {
        setWallet({ ...wallet, balance: freshBalance });
      }
      
      setShowPurchaseModal(false);
      toast.success(`Successfully purchased ${tokens} tokens!`);
    } catch (error) {
      console.error('Error updating balance after payment:', error);
      toast.error('Payment successful, but failed to update balance. Please refresh the page.');
    }
  };

  const handleCloseModal = () => {
    setShowPurchaseModal(false);
  };

  const handleLinkEmail = async () => {
    // Email linking not implemented in Prisma system yet
    toast.info('Email linking feature coming soon!');
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'text-sm',
          balance: 'text-lg font-semibold',
          icon: 'h-3 w-3'
        };
      case 'lg':
        return {
          container: 'text-lg',
          balance: 'text-4xl font-bold',
          icon: 'h-5 w-5'
        };
      default:
        return {
          container: 'text-base',
          balance: 'text-3xl font-bold',
          icon: 'h-4 w-4'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Coins className="w-5 h-5 text-yellow-500 animate-spin" />
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  // Compact display for navbar usage
  if (size === 'sm' && !showPurchaseButton && !showEmailLink) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Coins className={`${sizeClasses.icon} text-blue-600`} />
        <span className={`${sizeClasses.balance} text-blue-600`}>
          {loading ? '...' : currentBalance}
        </span>
        {showLabel && <span className="text-gray-600 text-xs">tokens</span>}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-3">
        {/* Token Balance Display */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-50 to-amber-50 px-3 py-2 rounded-lg border border-yellow-200">
          <Coins className={`${sizeClasses.icon} text-yellow-600`} />
          <span className={`font-semibold text-yellow-800 ${sizeClasses.container}`}>
            {currentBalance} {showLabel ? 'tokens' : ''}
          </span>
        </div>

        {/* Purchase Button */}
        {showPurchaseButton && (
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
            disabled={purchasing}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Buy Tokens</span>
          </button>
        )}

        {/* Email Link Status */}
        {wallet?.email_linked && (
          <div className="flex items-center space-x-1 text-green-600 text-sm">
            <Mail className="w-4 h-4" />
            <span>Email linked</span>
          </div>
        )}
      </div>

      {/* Token Packages Modal */}
      {showPackages && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl p-4 z-50 w-96 backdrop-blur-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Choose Your Token Package</h3>
            <p className="text-xs text-gray-600">Secure payment powered by Stripe</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative overflow-hidden rounded-lg p-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.01] hover:shadow-md ${
                  pkg.popular 
                    ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-400 shadow-sm' 
                    : 'bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
                onClick={() => handlePurchase(pkg.id)}
              >
                {pkg.popular && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg shadow-sm">
                      ⭐ Popular
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        pkg.popular ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`}></div>
                      <h4 className="text-xs font-medium text-gray-700">{pkg.name}</h4>
                    </div>
                    
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-yellow-600" />
                        <span className="text-gray-900">
                          <span className="text-xl font-bold">{pkg.tokens}</span>
                        <span className="text-sm font-normal"> tokens for {formatPrice(pkg.price)}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-sm">
                        <span className="font-bold text-blue-600">
                          {getPricePerToken(pkg)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-2 flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm border border-gray-200">
                    <ExternalLink className="w-2.5 h-2.5 text-blue-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowPackages(false)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Email Link Section */}
      {showEmailLink && !wallet?.email_linked && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Link Email for Backup
          </h4>
          <div className="flex space-x-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleLinkEmail}
              disabled={linkingEmail}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {linkingEmail ? 'Linking...' : 'Link'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Get a recovery code to restore your tokens if you lose browser data
          </p>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Purchase Tokens
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-2">
              <StripeCheckout 
                packages={packages}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenBalance;