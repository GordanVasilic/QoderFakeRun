/**
 * Stripe Checkout Component - Handles token purchase flow
 * Integrates with Stripe for secure payments
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Star, ExternalLink, ArrowLeft, AlertCircle, X } from 'lucide-react';
import { tokenService } from '@/lib/tokens';
import type { TokenPackage } from '@/lib/tokens';

// Helper function to format price from cents to dollars
const formatPrice = (priceInCents: number): string => {
  return (priceInCents / 100).toFixed(2);
};
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuthStore, ensureAnonymousId } from '@/store/authStore';

interface StripeCheckoutProps {
  packages: TokenPackage[];
  onSuccess: (tokens: number) => void;
  onCancel?: () => void;
  className?: string;
  showTitle?: boolean;
}

// Initialize Stripe with proper error handling
console.debug('Stripe publishable key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Present' : 'Missing');

const stripePromise = (() => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey || publishableKey.trim() === '') {
    console.error('Stripe publishable key is not configured');
    return Promise.resolve(null);
  }
  
  return loadStripe(publishableKey, {
    locale: 'en' // Explicitly set locale to avoid module loading issues
  }).then((stripe) => {
    console.debug('Stripe loaded successfully:', !!stripe);
    return stripe;
  }).catch((error) => {
    console.error('Failed to load Stripe:', error);
    return null;
  });
})();

// Countries list
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
];

// Card Decline Modal Component
const CardDeclineModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
}> = ({ isOpen, onClose, errorMessage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Declined</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-3">
            Your card has been declined. This could be due to:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• Insufficient funds</li>
            <li>• Card security settings</li>
            <li>• Incorrect card information</li>
            <li>• Bank security measures</li>
          </ul>
          
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Error Details:</p>
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Compact Payment Form Component
const CompactPaymentForm: React.FC<{
  selectedPackage: TokenPackage;
  onSuccess: (tokens: number) => void;
}> = ({ selectedPackage, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const { user, token } = useAuthStore();
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('US');
  const [cardError, setCardError] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineErrorMessage, setDeclineErrorMessage] = useState('');

  // Default postal codes for countries that require them
  const getDefaultPostalCode = (countryCode: string): string => {
    const defaults: Record<string, string> = {
      'US': '10001', // New York
      'CA': 'K1A 0A6', // Ottawa
      'GB': 'SW1A 1AA', // London
      'DE': '10115', // Berlin
      'FR': '75001', // Paris
      'IT': '00118', // Rome
      'ES': '28001', // Madrid
      'AU': '2000', // Sydney
      'JP': '100-0001', // Tokyo
      'BR': '01310-100', // São Paulo
      'IN': '110001', // New Delhi
      'MX': '06600', // Mexico City
      'NL': '1012', // Amsterdam
      'SE': '111 29', // Stockholm
      'NO': '0150', // Oslo
      'DK': '1050', // Copenhagen
      'FI': '00100', // Helsinki
      'CH': '3000', // Bern
      'AT': '1010', // Vienna
      'BE': '1000', // Brussels
    };
    return defaults[countryCode] || '00000';
  };
  const [elementsError, setElementsError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!stripe || !elements) {
      setElementsError('Payment elements are not available. Please refresh the page.');
    } else {
      setElementsError(null);
    }
  }, [stripe, elements]);

  // Handle card element changes for real-time validation
  const handleCardChange = (event: any) => {
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProcessing(true);

    if (!stripe || !elements) {
      toast.error('Stripe has not loaded yet. Please try again.');
      setProcessing(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Card element not found. Please refresh and try again.');
      setProcessing(false);
      return;
    }

    try {
      // Create payment intent
      const paymentIntentResponse = await fetch('/api/tokens/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          anonymousId: !user ? ensureAnonymousId() : undefined,
        }),
      });

      const paymentIntentData = await paymentIntentResponse.json();

      if (!paymentIntentData.success) {
        throw new Error(paymentIntentData.error || 'Failed to create payment intent');
      }

      // Create payment method
      const finalZipCode = zipCode.trim() || getDefaultPostalCode(country);
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          address: {
            postal_code: finalZipCode,
            country: country,
          },
        },
      });

      if (paymentMethodError) {
        // Check if it's a card decline error
        if (isCardDeclineError(paymentMethodError)) {
          setDeclineErrorMessage(paymentMethodError.message || 'Your card has been declined.');
          setShowDeclineModal(true);
        } else {
          throw new Error(paymentMethodError.message || 'Failed to create payment method');
        }
        return;
      }

      // Confirm payment with Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentData.data.clientSecret,
        {
          payment_method: paymentMethod.id,
        }
      );

      if (confirmError) {
        // Check if it's a card decline error
        if (isCardDeclineError(confirmError)) {
          setDeclineErrorMessage(confirmError.message || 'Your card has been declined.');
          setShowDeclineModal(true);
        } else {
          throw new Error(confirmError.message || 'Payment confirmation failed');
        }
        return;
      }

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error('Payment confirmation failed');
      }

      // Confirm payment on backend
      const confirmResponse = await fetch('/api/tokens/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentMethod.id,
          paymentId: paymentIntentData.data.paymentId,
          anonymousId: !user ? ensureAnonymousId() : undefined,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmData.success) {
        throw new Error(confirmData.error || 'Failed to confirm payment');
      }

      // Payment successful
      toast.success(`Payment successful! ${confirmData.data.tokensAdded} tokens added to your account.`);
      
      // Update token balance in auth store
      const { updateTokenBalance } = useAuthStore.getState();
      await updateTokenBalance();
      
      onSuccess(selectedPackage.tokens);
      
    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during payment';
      
      // Check if it's a card decline error in the catch block as well
      if (err instanceof Error && isCardDeclineError({ message: err.message })) {
        setDeclineErrorMessage(errorMessage);
        setShowDeclineModal(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Helper function to determine if an error is a card decline
  const isCardDeclineError = (error: any): boolean => {
    if (!error || !error.message) return false;
    
    const message = error.message.toLowerCase();
    const declineKeywords = [
      'card was declined',
      'your card has been declined',
      'insufficient funds',
      'card declined',
      'declined',
      'do not honor',
      'pickup card',
      'restricted card',
      'security violation',
      'lost card',
      'stolen card',
      'expired card',
      'invalid cvc',
      'processing error',
      'issuer declined'
    ];
    
    return declineKeywords.some(keyword => message.includes(keyword)) || 
           error.code === 'card_declined' ||
           error.decline_code;
  };

  return (
    <>
      <CardDeclineModal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        errorMessage={declineErrorMessage}
      />
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
        
        {elementsError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{elementsError}</span>
            </div>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Credit Card */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Information
            </label>
            <div className="border border-gray-300 rounded-lg p-3 bg-white">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '14px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                  hidePostalCode: true,
                }}
                onChange={handleCardChange}
              />
            </div>
            {cardError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{cardError}</span>
                </div>
              </div>
            )}
          </div>

        {/* Postal Code - Always visible and required */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Postal Code
          </label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={getDefaultPostalCode(country)}
            required
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        {/* Pay Button */}
        <button
          type="submit"
          disabled={!stripe || processing || !!elementsError}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          <span>
            {processing ? 'Processing...' : `Pay ${formatPrice(selectedPackage.price)}`}
          </span>
        </button>
      </form>
    </div>
    </>
  );
};

export const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  packages,
  onSuccess,
  onCancel,
  className = '',
  showTitle = true
}) => {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    stripePromise.then((stripe) => {
      if (!stripe) {
        setStripeError('Payment system is currently unavailable. Please try again later.');
      }
    }).catch(() => {
      setStripeError('Failed to initialize payment system. Please refresh the page and try again.');
    });
  }, []);

  const handlePackageSelect = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (tokens: number) => {
    onSuccess(tokens);
    setShowPayment(false);
    setSelectedPackage(null);
  };

  const getPackageFeatures = (pkg: TokenPackage): string[] => {
    const features = [`${pkg.tokens} download tokens`];
    
    if (pkg.tokens >= 10) {
      features.push('Best value per token');
    }
    if (pkg.tokens >= 25) {
      features.push('Premium support');
      features.push('Priority downloads');
    }
    
    return features;
  };

  return (
    <Elements stripe={stripePromise}>
      <div className={`bg-white ${className}`}>
        {showTitle && (
          <div className="text-center mb-4">
            <p className="text-gray-600 text-sm">
              Select package
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Packages Section - Top */}
          <div className="w-full">
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto justify-center ml-2">
              {packages.map((pkg) => {
                const isSelected = selectedPackage === pkg;
                const features = getPackageFeatures(pkg);
                
                return (
                  <div
                    key={pkg.id}
                    className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 w-40 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    } ${
                      pkg.popular ? 'ring-1 ring-blue-200' : ''
                    }`}
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    {/* Popular Badge */}
                    {pkg.popular && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Popular</span>
                        </div>
                      </div>
                    )}

                    <div className="text-center mt-1">
                      <h4 className="text-sm font-bold text-gray-900 mb-2">{pkg.name}</h4>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 text-blue-800 px-3 py-2 rounded-lg text-lg font-bold my-2 border border-blue-200">
                        {pkg.tokens} tokens
                      </div>
                      <div className="text-sm font-bold text-blue-600 my-1">
                        {formatPrice(pkg.price)}
                      </div>
                      <div className="text-xs text-gray-600">
                        ${(pkg.price / 100 / pkg.tokens).toFixed(2)} per token
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Section */}
          {stripeError && (
            <div className="w-full border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Payment System Error</p>
                  <p className="text-sm text-red-600">{stripeError}</p>
                </div>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          )}

          {/* Payment Section - Bottom */}
          {selectedPackage && showPayment && !stripeError && (
            <div className="w-full border-t border-gray-200 pt-4">
              <CompactPaymentForm
                selectedPackage={selectedPackage}
                onSuccess={handlePaymentSuccess}
              />
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p className="flex items-center justify-center space-x-1">
            <span>🔒</span>
            <span>Secure payment processing by Stripe</span>
          </p>
        </div>
      </div>
    </Elements>
  );
};