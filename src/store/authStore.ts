import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { tokenService } from '@/utils/tokenService';
import { networkMonitor } from '@/utils/networkMonitor';

// Define the store state type
export interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
  } | null; // User data
  token: string | null;
  tokenBalance: number;
  loading: boolean;
  error: string | null;
  
  // For anonymous users
  anonymousId: string | null;
  anonymousTokenBalance: number;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  updateTokenBalance: () => Promise<number>;
}

// Create the auth store
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isAuthenticated: false,
        user: null,
        token: null,
        tokenBalance: 0,
        loading: false,
        error: null,
        anonymousId: null,
        anonymousTokenBalance: 0,
        
        // Actions
        login: async (email, password) => {
          try {
            set({ loading: true, error: null });
            
            // Get anonymousId if exists to transfer tokens
            const anonymousId = get().anonymousId;
            
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, anonymousId })
            });
            
            const result = await response.json();
            
            if (!result.success) {
              set({ loading: false, error: result.error || 'Login failed' });
              return false;
            }
            
            const { user, token } = result.data;
            
            set({ 
              isAuthenticated: true,
              user,
              token,
              tokenBalance: user.tokenBalance || 0,
              loading: false,
              // Clear anonymous data after successful login
              anonymousId: null,
              anonymousTokenBalance: 0
            });
            
            return true;
          } catch (error) {
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Login failed'
            });
            return false;
          }
        },
        
        register: async (userData) => {
          try {
            set({ loading: true, error: null });
            
            const response = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (!result.success) {
              set({ loading: false, error: result.error || 'Registration failed' });
              return false;
            }
            
            const { user, token } = result.data;
            
            set({ 
              isAuthenticated: true,
              user,
              token,
              tokenBalance: user.tokenBalance || 0,
              loading: false
            });
            
            // Transfer tokens if anonymous
            const anonymousId = get().anonymousId;
            if (anonymousId) {
              // Transfer will happen on the server
              set({ anonymousId: null, anonymousTokenBalance: 0 });
            }
            
            return true;
          } catch (error) {
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Registration failed'
            });
            return false;
          }
        },
        
        logout: () => {
            // Check if we're on the client side
            if (typeof window === 'undefined') {
              return;
            }
            
            console.log('🚪 [authStore] logout called');
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              tokenBalance: 0,
              loading: false,
              error: null
            });
          },
        
        checkAuth: async () => {
          // Check if we're on the client side
          if (typeof window === 'undefined') {
            return false;
          }
          
          try {
            const token = get().token;
            
            if (!token) {
              set({ isAuthenticated: false, user: null });
              // Ensure we have an anonymous ID for non-authenticated users
              ensureAnonymousId();
              
              // Log the current persisted balance before updating
              const currentAnonymousBalance = get().anonymousTokenBalance;
              console.log('🔍 [authStore] checkAuth - current anonymous balance before server sync:', currentAnonymousBalance);
              
              // Update token balance for anonymous users - but don't fail checkAuth if it fails
              try {
                const serverBalance = await get().updateTokenBalance();
                console.log('🔍 [authStore] checkAuth - server returned balance:', serverBalance);
                console.log('🔍 [authStore] checkAuth - balance after server sync:', get().anonymousTokenBalance);
              } catch (balanceError) {
                console.warn('Failed to update token balance during checkAuth, but continuing:', balanceError);
              }
              return false;
            }
            
            const response = await fetch('/api/auth/profile', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const result = await response.json();
            
            if (!result.success) {
              set({ isAuthenticated: false, user: null, token: null });
              return false;
            }
            
            set({ 
              isAuthenticated: true,
              user: result.data.user,
              tokenBalance: result.data.user.tokenBalance || 0
            });
            
            return true;
          } catch (error) {
            console.error('checkAuth error:', error instanceof Error ? error.message : 'Unknown error');
            set({ isAuthenticated: false, user: null, token: null });
            return false;
          }
        },
        
        updateTokenBalance: async () => {
          // Check if we're on the client side
          if (typeof window === 'undefined') {
            return 0;
          }
          
          console.log('🔄 [authStore] updateTokenBalance called');
          const { user, anonymousId } = get();
          
          // Clear any cached balance first to prevent showing stale data
          if (user) {
            set({ tokenBalance: 0 });
          } else {
            set({ anonymousTokenBalance: 0 });
          }
          
          // Retry logic with exponential backoff and better error handling
          const fetchWithRetry = async (url: string, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                console.log(`🔄 [authStore] Attempt ${attempt}/${maxRetries} for ${url}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                  console.warn(`⏰ [authStore] Request timeout after 10s on attempt ${attempt}`);
                  controller.abort();
                }, 10000); // 10 second timeout
                
                const response = await fetch(url, {
                  signal: controller.signal,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  cache: 'no-cache'
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                  console.log(`✅ [authStore] Success on attempt ${attempt}`);
                  return response;
                } else {
                  const errorBody = await response.text();
                  console.warn(`⚠️ [authStore] Attempt ${attempt} failed with status ${response.status}:`, errorBody);
                  
                  // Don't retry on client errors (4xx), only on server errors (5xx) and network issues
                  if (response.status >= 400 && response.status < 500 && attempt === maxRetries) {
                    throw new Error(`Client error ${response.status}: ${errorBody}`);
                  }
                  
                  if (attempt === maxRetries) {
                    throw new Error(`Server error ${response.status}: Failed to fetch wallet balance after ${maxRetries} attempts`);
                  }
                }
              } catch (error: unknown) {
                const errorObj = error as Error;
                const isAbortError = errorObj.name === 'AbortError';
                const isNetworkError = errorObj.message.includes('fetch') || errorObj.message.includes('network') || errorObj.message.includes('Failed to fetch');
                
                console.warn(`⚠️ [authStore] Attempt ${attempt} failed:`, {
                  message: errorObj.message,
                  name: errorObj.name,
                  isAbortError,
                  isNetworkError
                });
                
                if (attempt === maxRetries) {
                  if (isAbortError) {
                    throw new Error('Request timeout: Server took too long to respond');
                  } else if (isNetworkError) {
                    throw new Error('Network error: Unable to connect to server');
                  } else {
                    throw error;
                  }
                }
                
                // Exponential backoff: wait 1s, 2s, 4s
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`⏳ [authStore] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
            throw new Error('Max retries exceeded');
          };
          
          if (user) {
            console.log('👤 [authStore] User authenticated, fetching user wallet');
            try {
              const response = await fetchWithRetry('/api/tokens/wallet');
              const data = await response.json();
              console.log('✅ [authStore] User wallet data received:', data);
              set({ tokenBalance: data.balance });
              return data.balance;
            } catch (error) {
              console.error('💥 [authStore] User wallet fetch error:', error);
              throw error;
            }
          } else {
            console.log('👻 [authStore] Anonymous user, fetching anonymous wallet');
            
            // Ensure we have an anonymous ID
            let currentAnonymousId = anonymousId;
            if (!currentAnonymousId) {
              console.log('🔧 [authStore] No anonymousId found, generating new one...');
              currentAnonymousId = ensureAnonymousId();
            }
            
            if (!currentAnonymousId) {
              console.error('❌ [authStore] Failed to generate anonymousId for anonymous user');
              throw new Error('Anonymous ID not available');
            }
            
            try {
              const url = `/api/tokens/wallet?anonymousId=${currentAnonymousId}`;
              console.log(`📡 [authStore] Anonymous wallet API request to: ${url}`);
              
              // Check network status first
              const networkInfo = networkMonitor.getNetworkInfo();
              console.log('🌐 [authStore] Network info:', networkInfo);
              
              if (!networkMonitor.getNetworkStatus()) {
                console.warn('⚠️ [authStore] Network offline, using fallback balance of 0');
                set({ anonymousTokenBalance: 0 });
                return 0;
              }
              
              // Test basic connectivity
              const isConnected = await networkMonitor.testConnectivity();
              if (!isConnected) {
                console.warn('⚠️ [authStore] Health check failed, using fallback balance of 0');
                set({ anonymousTokenBalance: 0 });
                return 0;
              }
              
              // Try the wallet API directly without URL variants
              console.log(`🔄 [authStore] Calling wallet API: ${url}`);
              const response = await fetchWithRetry(url);
              const data = await response.json();
              console.log('✅ [authStore] Anonymous wallet data received:', data);
              set({ anonymousTokenBalance: data.balance });
              return data.balance;
            } catch (error) {
              console.error('💥 [authStore] Anonymous wallet fetch error:', {
                error: error instanceof Error ? error.message : String(error),
                anonymousId: currentAnonymousId,
                timestamp: new Date().toISOString(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
                networkInfo: networkMonitor.getNetworkInfo()
              });
              
              // Set a fallback balance to prevent UI issues
              console.warn('⚠️ [authStore] Using fallback balance of 0 due to error');
              set({ anonymousTokenBalance: 0 });
              return 0;
            }
          }
        }
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ 
          token: state.token,
          anonymousId: state.anonymousId,
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          tokenBalance: state.tokenBalance,
          anonymousTokenBalance: state.anonymousTokenBalance
        })
      }
    ),
    {
      name: 'auth-store'
    }
  )
);

// Helper to ensure we have an anonymous ID
export function ensureAnonymousId() {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return null;
  }
  
  const { anonymousId, isAuthenticated } = useAuthStore.getState();
  
  console.log('ensureAnonymousId called - isAuthenticated:', isAuthenticated, 'existing anonymousId:', anonymousId);
  
  if (isAuthenticated || anonymousId) {
    console.log('Returning existing anonymousId:', anonymousId);
    return anonymousId;
  }
  
  const newAnonymousId = tokenService.generateAnonymousId();
  console.log('Generated new anonymousId:', newAnonymousId);
  useAuthStore.setState({ anonymousId: newAnonymousId });
  
  return newAnonymousId;
}