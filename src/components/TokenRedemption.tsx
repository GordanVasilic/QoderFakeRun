/**
 * Token Redemption Component - Handles token-based download access
 * Integrates with existing download functionality
 */

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Download, Coins, AlertCircle, RefreshCw } from 'lucide-react';
import { tokenService, TokenWallet } from '@/utils/tokenService';
import { toast } from 'sonner';
import { useAuthStore, ensureAnonymousId } from '@/store/authStore';
import { TokenBalance } from './TokenBalance';

interface TokenRedemptionProps {
  // For direct download mode
  downloadUrl?: string;
  fileName?: string;
  
  // For custom action mode
  cost?: number;
  action?: string;
  onRedeem?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  processingText?: string;
  
  // Common props
  tokensRequired?: number;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  className?: string;
  
  // Modal trigger for insufficient tokens
  onShowTokenModal?: () => void;
}

export const TokenRedemption: React.FC<TokenRedemptionProps> = ({
  downloadUrl,
  fileName = 'File',
  cost,
  action = 'download',
  onRedeem,
  disabled = false,
  isProcessing = false,
  processingText = 'Processing...',
  tokensRequired,
  onDownloadStart,
  onDownloadComplete,
  className = '',
  onShowTokenModal
}) => {
  // Use cost if provided, otherwise use tokensRequired, default to 1
  const requiredTokens = cost || tokensRequired || 1;
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Use authStore for consistent token balance across components
  const { isAuthenticated, tokenBalance, anonymousTokenBalance, updateTokenBalance, user } = useAuthStore();
  const currentBalance = isAuthenticated ? tokenBalance : anonymousTokenBalance;

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      // Update token balance from authStore to ensure consistency
      await updateTokenBalance();
      
    } catch (error) {
      console.error('Failed to load wallet:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = 'Failed to load wallet';
      if (error instanceof Error) {
        if (error.message.includes('Network error after')) {
          errorMessage = 'Connection issues detected. Please check your internet connection and try again.';
        } else if (error.message.includes('Request timeout')) {
          errorMessage = 'Server is taking too long to respond. Please try again in a moment.';
        } else if (error.message.includes('server restart')) {
          errorMessage = 'Server is restarting. Please wait a moment and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRedemption = async () => {
    if (currentBalance < requiredTokens) {
      toast.error(`Insufficient tokens. You need ${requiredTokens} tokens.`);
      return;
    }

    setRedeeming(true);
    onDownloadStart?.();

    try {
      // If custom onRedeem is provided, use it instead of direct download
      if (onRedeem) {
        // For custom actions, we still need to redeem tokens first
        const anonymousId = ensureAnonymousId();
        if (!anonymousId) {
          throw new Error('Anonymous ID not available');
        }
        const result = await tokenService.redeemTokens(requiredTokens, window.location.href, anonymousId);
        
        console.log('🔍 [TokenRedemption] Redemption result:', result);
        
        if (result.success) {
          setHasAccess(true);
          
          // Immediately update the local balance to reflect the change
          const { isAuthenticated, updateTokenBalance } = useAuthStore.getState();
          console.log('🔍 [TokenRedemption] Current auth state:', { isAuthenticated, currentBalance });
          console.log('🔍 [TokenRedemption] Updating balance to:', result.remaining_balance);
          
          if (isAuthenticated) {
            useAuthStore.setState({ tokenBalance: result.remaining_balance });
          } else {
            useAuthStore.setState({ anonymousTokenBalance: result.remaining_balance });
          }
          
          // Verify the update
          const newState = useAuthStore.getState();
          console.log('🔍 [TokenRedemption] New auth state after update:', {
            tokenBalance: newState.tokenBalance,
            anonymousTokenBalance: newState.anonymousTokenBalance
          });
          
          // Skip server update to avoid overwriting the correct balance
          // The redemption API already updated the server, so we trust the result.remaining_balance
          console.log('🔍 [TokenRedemption] Skipping server update to prevent overwriting correct balance');
          
          toast.success(`${requiredTokens} token${requiredTokens > 1 ? 's' : ''} redeemed!`);
          
          // Call the custom action
          onRedeem();
          onDownloadComplete?.();
          
          // Reset hasAccess after a short delay to allow for multiple actions
          setTimeout(() => {
            setHasAccess(false);
          }, 2000);
        } else {
          throw new Error('Redemption failed');
        }
      } else if (downloadUrl) {
        // Direct download mode
        const anonymousId = ensureAnonymousId();
        if (!anonymousId) {
          throw new Error('Anonymous ID not available');
        }
        const result = await tokenService.redeemTokens(requiredTokens, downloadUrl, anonymousId);
        
        console.log('🔍 [TokenRedemption] Direct download redemption result:', result);
        
        if (result.success) {
          setHasAccess(true);
          
          // Immediately update the local balance to reflect the change
          const { isAuthenticated, updateTokenBalance } = useAuthStore.getState();
          console.log('🔍 [TokenRedemption] Direct download - Current auth state:', { isAuthenticated, currentBalance });
          console.log('🔍 [TokenRedemption] Direct download - Updating balance to:', result.remaining_balance);
          
          if (isAuthenticated) {
            useAuthStore.setState({ tokenBalance: result.remaining_balance });
          } else {
            useAuthStore.setState({ anonymousTokenBalance: result.remaining_balance });
          }
          
          // Verify the update
          const newState = useAuthStore.getState();
          console.log('🔍 [TokenRedemption] Direct download - New auth state after update:', {
            tokenBalance: newState.tokenBalance,
            anonymousTokenBalance: newState.anonymousTokenBalance
          });
          
          // Skip server update to avoid overwriting the correct balance
          // The redemption API already updated the server, so we trust the result.remaining_balance
          console.log('🔍 [TokenRedemption] Direct download - Skipping server update to prevent overwriting correct balance');
          
          toast.success(`${requiredTokens} token${requiredTokens > 1 ? 's' : ''} redeemed! Download starting...`);
          
          // Start the actual download
          const link = document.createElement('a');
          link.href = result.download_url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          onDownloadComplete?.();
          
          // Reset hasAccess after a short delay to allow for multiple downloads
          setTimeout(() => {
            setHasAccess(false);
          }, 2000);
        } else {
          throw new Error('Redemption failed');
        }
      } else {
        throw new Error('No download URL or custom action provided');
      }
    } catch (error) {
      console.error('Redemption failed:', error);
      toast.error('Failed to redeem tokens. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const canRedeem = currentBalance >= requiredTokens && !disabled;
  const needsMoreTokens = currentBalance < requiredTokens;

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Coins className="w-5 h-5 text-yellow-500 animate-spin mr-2" />
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  // Show error state with retry button
  if (loadError && currentBalance === null) {
    return (
      <div className={`bg-white border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center space-y-3 flex-col">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Failed to load wallet</span>
          </div>
          <p className="text-sm text-gray-600 text-center">{loadError}</p>
          <button
            onClick={loadWallet}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {hasAccess ? (
            <Unlock className="w-5 h-5 text-green-600" />
          ) : (
            <Lock className="w-5 h-5 text-gray-400" />
          )}
          <h3 className="font-semibold text-gray-900">
            {hasAccess ? 'Download Available' : 'Premium Download'}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Coins className="w-4 h-4 text-yellow-600" />
          <span>{currentBalance} tokens</span>
        </div>
      </div>

      {/* File Info - REMOVED as requested */}

      {/* Action Area */}
      <div className="space-y-3">
        {hasAccess ? (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <Unlock className="w-5 h-5" />
            <span className="text-sm font-medium">Download access granted!</span>
          </div>
        ) : needsMoreTokens ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <div className="text-sm">
                <p className="font-medium">Insufficient tokens</p>
                <p>You need {requiredTokens - currentBalance} more token{requiredTokens - currentBalance > 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <button
              onClick={onShowTokenModal || (() => window.location.reload())}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Buy More Tokens
            </button>
          </div>
        ) : (
          <button
            onClick={handleRedemption}
            disabled={redeeming || isProcessing || !canRedeem}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              canRedeem && !disabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {redeeming ? (
              <>
                <Coins className="w-5 h-5 animate-spin" />
                <span>Redeeming...</span>
              </>
            ) : isProcessing ? (
              <>
                <Coins className="w-5 h-5 animate-spin" />
                <span>{processingText}</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Activity File (1 token)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Balance Info - REMOVED as requested */}
    </div>
  );
};

export default TokenRedemption;