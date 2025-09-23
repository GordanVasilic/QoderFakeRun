import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAuthStore, ensureAnonymousId } from './authStore';

// Define types for token packages
export interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  name: string;
}

// Define the store state type
export interface TokenState {
  // Package data
  packages: TokenPackage[];
  selectedPackage: TokenPackage | null;
  
  // Payment state
  isLoading: boolean;
  error: string | null;
  
  // Transaction data
  paymentId: string | null;
  checkoutUrl: string | null;
  lastPurchasedTokens: number | null;
  
  // Actions
  fetchPackages: () => Promise<TokenPackage[]>;
  selectPackage: (packageId: string) => void;
  purchaseTokens: (successUrl: string, cancelUrl: string) => Promise<string | null>;
  checkPaymentStatus: (paymentId: string) => Promise<{ success: boolean; data?: { status: string; tokens?: number; [key: string]: unknown }; error?: string; }>;
  resetState: () => void;
}

// Create the token store
export const useTokenStore = create<TokenState>()(
  devtools(
    (set, get) => ({
      // Initial state
      packages: [],
      selectedPackage: null,
      isLoading: false,
      error: null,
      paymentId: null,
      checkoutUrl: null,
      lastPurchasedTokens: null,
      
      // Actions
      fetchPackages: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const authState = useAuthStore.getState();
          let headers = {};
          
          // Add auth token if logged in
          if (authState.isAuthenticated && authState.token) {
            headers = { 'Authorization': `Bearer ${authState.token}` };
          }
          
          const response = await fetch('/api/tokens', { headers });
          const result = await response.json();
          
          if (!result.success) {
            set({ isLoading: false, error: result.error || 'Failed to fetch token packages' });
            return [];
          }
          
          set({ 
            isLoading: false, 
            packages: result.data.packages || []
          });
          
          return result.data.packages || [];
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch packages'
          });
          return [];
        }
      },
      
      selectPackage: (packageId) => {
        const selectedPackage = get().packages.find(pkg => pkg.id === packageId) || null;
        set({ selectedPackage });
      },
      
      purchaseTokens: async (successUrl, cancelUrl) => {
        try {
          const selectedPackage = get().selectedPackage;
          if (!selectedPackage) {
            set({ error: 'No package selected' });
            return null;
          }
          
          set({ isLoading: true, error: null });
          
          // Get auth state
          const authState = useAuthStore.getState();
          
          // Prepare request data
          const requestData: {
            packageId: string;
            successUrl: string;
            cancelUrl: string;
            anonymousId?: string;
          } = {
            packageId: selectedPackage.id,
            successUrl,
            cancelUrl
          };
          
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          
          // Use authentication if available
          if (authState.isAuthenticated && authState.token) {
            headers['Authorization'] = `Bearer ${authState.token}`;
          } else {
            // For anonymous users, ensure we have an ID
            requestData.anonymousId = ensureAnonymousId() || undefined;
          }
          
          // Make API request
          const response = await fetch('/api/tokens', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestData)
          });
          
          const result = await response.json();
          
          if (!result.success) {
            set({ 
              isLoading: false, 
              error: result.error || 'Failed to initiate purchase' 
            });
            return null;
          }
          
          // For anonymous users, store the ID if returned
          if (result.data.anonymousId && !authState.isAuthenticated) {
            useAuthStore.setState({ anonymousId: result.data.anonymousId });
          }
          
          set({
            isLoading: false,
            paymentId: result.data.paymentId,
            checkoutUrl: result.data.sessionUrl,
            lastPurchasedTokens: selectedPackage.tokens
          });
          
          return result.data.sessionUrl;
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to purchase tokens'
          });
          return null;
        }
      },
      
      checkPaymentStatus: async (paymentId) => {
        try {
          const authState = useAuthStore.getState();
          let headers = {};
          
          // Add auth token if logged in
          if (authState.isAuthenticated && authState.token) {
            headers = { 'Authorization': `Bearer ${authState.token}` };
          }
          
          const response = await fetch(`/api/tokens/status?paymentId=${paymentId}`, { headers });
          const result = await response.json();
          
          if (!result.success) {
            return { success: false, error: result.error || 'Payment status check failed' };
          }
          
          // If payment completed, update token balance
          if (result.data.status === 'COMPLETED') {
            // Update token balance in auth store
            await useAuthStore.getState().updateTokenBalance();
            
            // Return success with tokens added info
            const tokensAdded = get().lastPurchasedTokens || 0;
            return { 
              success: true, 
              data: { 
                status: result.data.status,
                tokensAdded,
                payment: result.data.payment
              }
            };
          }
          
          return { 
            success: true, 
            data: { 
              status: result.data.status,
              payment: result.data.payment
            }
          };
        } catch (error) {
          console.error('Error checking payment status:', error);
          return { success: false, error: 'Failed to check payment status' };
        }
      },
      
      resetState: () => {
        set({
          selectedPackage: null,
          paymentId: null,
          checkoutUrl: null,
          error: null
        });
      }
    }),
    {
      name: 'token-store'
    }
  )
);

export default useTokenStore;