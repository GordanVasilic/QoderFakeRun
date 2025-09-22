// Network monitoring utility to help diagnose connectivity issues
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private isOnline: boolean = true;
  private listeners: Array<(isOnline: boolean) => void> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      
      window.addEventListener('online', () => {
        console.log('🌐 [NetworkMonitor] Network connection restored');
        this.isOnline = true;
        this.notifyListeners(true);
      });

      window.addEventListener('offline', () => {
        console.warn('📡 [NetworkMonitor] Network connection lost');
        this.isOnline = false;
        this.notifyListeners(false);
      });
    }
  }

  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  public getNetworkStatus(): boolean {
    return this.isOnline;
  }

  public addListener(callback: (isOnline: boolean) => void): void {
    this.listeners.push(callback);
  }

  public removeListener(callback: (isOnline: boolean) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }

  // Test network connectivity by making a simple request
  public async testConnectivity(): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    try {
      console.log('🔍 [NetworkMonitor] Testing network connectivity...');
      
      // Try to fetch a simple endpoint with a longer timeout to prevent ERR_ABORTED
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [NetworkMonitor] Request timeout, aborting...');
        controller.abort();
      }, 10000); // Increased timeout to 10 seconds

      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      
      const isConnected = response.ok;
      console.log(`${isConnected ? '✅' : '❌'} [NetworkMonitor] Connectivity test result:`, isConnected, 'Status:', response.status);
      
      return isConnected;
    } catch (error) {
      // Handle AbortError specifically to avoid logging it as a real error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏰ [NetworkMonitor] Request was aborted due to timeout');
        return false;
      }
      console.warn('⚠️ [NetworkMonitor] Connectivity test failed:', error);
      return false;
    }
  }

  // Get detailed network information
  public getNetworkInfo(): object {
    if (typeof window === 'undefined' || !('navigator' in window)) {
      return { available: false };
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      online: navigator.onLine,
      connection: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      } : null,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const networkMonitor = NetworkMonitor.getInstance();