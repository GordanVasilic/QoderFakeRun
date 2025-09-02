import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { tokenService } from '@/lib/tokens';

// Define the store state type
export interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  user: any | null; // User data
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
          set({ 
            isAuthenticated: false,
            user: null,
            token: null,
            tokenBalance: 0,
            error: null
          });
        },
        
        checkAuth: async () => {
          try {
            const token = get().token;
            
            if (!token) {
              set({ isAuthenticated: false, user: null });
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
          try {
            // For authenticated users, get from API
            if (get().isAuthenticated) {
              const token = get().token;
              
              if (!token) return get().tokenBalance;
              
              const response = await fetch('/api/tokens', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              const result = await response.json();
              
              if (!result.success) return get().tokenBalance;
              
              set({ tokenBalance: result.data.userTokens || 0 });
              return result.data.userTokens || 0;
            }
            
            // For anonymous users
            const anonymousId = get().anonymousId;
            if (anonymousId) {
              const response = await fetch(`/api/tokens?anonymousId=${anonymousId}`);
              const result = await response.json();
              
              if (!result.success) return get().anonymousTokenBalance;
              
              set({ anonymousTokenBalance: result.data.anonymousTokens || 0 });
              return result.data.anonymousTokens || 0;
            }
            
            return 0;
          } catch (error) {
            console.error('Error updating token balance:', error);
            return get().isAuthenticated ? get().tokenBalance : get().anonymousTokenBalance;
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
          tokenBalance: state.tokenBalance
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
  const { anonymousId, isAuthenticated } = useAuthStore.getState();
  
  if (isAuthenticated || anonymousId) {
    return anonymousId;
  }
  
  const newAnonymousId = tokenService.generateAnonymousId();
  useAuthStore.setState({ anonymousId: newAnonymousId });
  
  return newAnonymousId;
}