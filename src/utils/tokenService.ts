/**
 * Token Service - Manages token operations (balance, purchase, redemption)
 * Integrates with Stripe for payments and Supabase for data storage
 */

// Removed browserIDManager import - now using anonymousId parameter

export interface TokenWallet {
  balance: number;
  email_linked: boolean;
  last_purchase: string | null;
}

export interface PurchaseResponse {
  checkout_url: string;
  session_id: string;
}

export interface RedeemResponse {
  success: boolean;
  remaining_balance: number;
  tokens_used: number;
  download_url: string;
}

export interface PaymentIntentRequest {
  package_id: string;
  postal_code: string;
  country: string;
}

export interface PaymentIntentResponse {
  client_secret: string;
  amount: number;
}

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price_cents: number;
  stripe_price_id: string;
  popular?: boolean;
}

// Available token packages
export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Start',
    tokens: 3,
    price_cents: 200, // $2.00
    stripe_price_id: 'price_1S3imSAQ8sN5JWptWlwhoy0d'
  },
  {
    id: 'popular',
    name: 'Popular',
    tokens: 10,
    price_cents: 500, // $5.00
    stripe_price_id: 'price_1S3in1AQ8sN5JWpt4ADlVjVa',
    popular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    tokens: 20,
    price_cents: 900, // $9.00
    stripe_price_id: 'price_1S3inQAQ8sN5JWpt5kLhOm6j'
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    tokens: 50,
    price_cents: 1500, // $15.00
    stripe_price_id: 'price_1S3inkAQ8sN5JWptLPISdwL7'
  }
];

export class TokenService {
  private static instance: TokenService;
  private baseUrl: string;

  private constructor() {
    if (typeof window !== 'undefined') {
      // Client-side: use current origin
      this.baseUrl = window.location.origin;
    } else {
      // Server-side: always use production URL in production environment
      // Don't use VERCEL_URL as it points to preview deployments with auth protection
      this.baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.fakemyride.com'
        : 'http://localhost:3000';
    }
  }

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Get current token wallet balance with retry logic
   */
  public async getWallet(anonymousId?: string): Promise<TokenWallet> {
    if (!anonymousId) {
      throw new Error('Anonymous ID is required');
    }
    
    console.log('TokenService.getWallet called with anonymousId:', anonymousId);
    const url = `${this.baseUrl}/api/tokens/wallet?anonymousId=${encodeURIComponent(anonymousId)}`;
    console.log('Making request to:', url);
    
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} for wallet request`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        console.log('Response received - status:', response.status, 'statusText:', response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
            console.error('Error response body:', errorText);
          } catch (textError) {
            console.error('Failed to read error response text:', textError);
          }
          
          const errorMessage = `Failed to fetch wallet: ${response.status} ${response.statusText}${errorText ? ' - ' + errorText : ''}`;
          console.error('Full error details:', errorMessage);
          
          // Don't retry on client errors (4xx), only on server errors (5xx) or network issues
          if (response.status >= 400 && response.status < 500) {
            throw new Error(errorMessage);
          }
          
          // For server errors, try again if we have retries left
          if (attempt === maxRetries) {
            throw new Error(errorMessage);
          }
          
          console.log(`Server error (${response.status}), retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        let result;
        try {
          result = await response.json();
          console.log('Wallet response parsed successfully:', result);
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          const responseText = await response.text();
          console.error('Raw response text:', responseText);
          throw new Error('Failed to parse wallet response as JSON');
        }
        
        return result;
      } catch (error) {
        console.error(`TokenService.getWallet - Attempt ${attempt} failed:`, error);
        console.error('Error type:', typeof error);
        
        // Type guard for error handling
        const errorName = error instanceof Error ? error.name : 'Unknown';
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        console.error('Error name:', errorName);
        console.error('Error message:', errorMessage);
        
        // Handle network errors with retry logic
        if (error instanceof TypeError && errorMessage.includes('fetch')) {
          if (attempt === maxRetries) {
            throw new Error(`Network error after ${maxRetries} attempts: Unable to connect to ${url}. This may be due to server restart or network issues.`);
          }
          
          console.log(`Network error detected, retrying in ${retryDelay}ms... (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // Handle timeout errors
        if (errorName === 'AbortError') {
          if (attempt === maxRetries) {
            throw new Error(`Request timeout after ${maxRetries} attempts. Server may be overloaded.`);
          }
          
          console.log(`Request timeout, retrying in ${retryDelay}ms... (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // For other errors, don't retry
        throw error;
      }
    }
    
    // This should never be reached, but just in case
    throw new Error('Unexpected error: All retry attempts exhausted');
  }

  /**
   * Create Stripe checkout session for token purchase
   */
  public async createCheckoutSession(packageId: string, anonymousId?: string): Promise<PurchaseResponse> {
    const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
    if (!tokenPackage) {
      throw new Error('Invalid token package');
    }

    if (!anonymousId) {
      throw new Error('Anonymous ID is required');
    }
    
    const response = await fetch(`${this.baseUrl}/api/tokens/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price_id: tokenPackage.stripe_price_id,
        anonymousId: anonymousId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    return response.json();
  }

  /**
   * Create payment intent for inline Stripe Elements payment
   */
  public async createPaymentIntent(request: PaymentIntentRequest, anonymousId?: string): Promise<PaymentIntentResponse> {
    const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === request.package_id);
    if (!tokenPackage) {
      throw new Error('Invalid token package');
    }

    if (!anonymousId) {
      throw new Error('Anonymous ID is required');
    }
    
    const response = await fetch(`${this.baseUrl}/api/tokens/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        package_id: request.package_id,
        anonymousId: anonymousId,
        postal_code: request.postal_code,
        country: request.country,
        amount: tokenPackage.price_cents
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment intent');
    }

    return response.json();
  }

  /**
   * Redeem tokens for download access
   */
  public async redeemTokens(tokensToRedeem: number, downloadUrl: string, anonymousId?: string): Promise<RedeemResponse> {
    if (!anonymousId) {
      throw new Error('Anonymous ID is required');
    }
    
    const response = await fetch(`${this.baseUrl}/api/tokens/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        anonymousId: anonymousId,
        tokens_to_redeem: tokensToRedeem,
        download_url: downloadUrl
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to redeem tokens');
    }

    return response.json();
  }

  /**
   * Link email to wallet for backup/recovery
   */
  public async linkEmail(email: string, anonymousId?: string): Promise<{ success: boolean; recovery_code: string }> {
    if (!anonymousId) {
      throw new Error('Anonymous ID is required');
    }
    
    const response = await fetch(`${this.baseUrl}/api/tokens/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, anonymousId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to link email');
    }

    return response.json();
  }

  /**
   * Format price for display
   */
  public static formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Get token package by ID
   */
  public static getPackage(packageId: string): TokenPackage | undefined {
    return TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
  }

  /**
   * Calculate tokens per dollar for a package
   */
  public static getTokensPerDollar(tokenPackage: TokenPackage): number {
    return tokenPackage.tokens / (tokenPackage.price_cents / 100);
  }

  /**
   * Calculate price per token for a package
   */
  public static getPricePerToken(tokenPackage: TokenPackage): string {
    const pricePerToken = tokenPackage.price_cents / 100 / tokenPackage.tokens;
    return `$${pricePerToken.toFixed(2)} per token`;
  }

  /**
   * Generate a new anonymous ID
   */
  public generateAnonymousId(): string {
    return 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

// Export singleton instance
export const tokenService = TokenService.getInstance();