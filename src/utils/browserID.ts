/**
 * Browser ID Manager
 * Manages unique browser identification for token system
 */

export class BrowserIDManager {
  private static readonly STORAGE_KEY = 'qoder_browser_id';
  private static readonly COOKIE_NAME = 'qoder_browser_id';
  
  /**
   * Get or create browser ID
   * @returns {string} Browser ID
   */
  static getBrowserID(): string {
    // Try localStorage first
    let browserID = this.getFromLocalStorage();
    
    if (!browserID) {
      // Try cookie as fallback
      browserID = this.getCookie(this.COOKIE_NAME);
    }
    
    if (!browserID) {
      // Generate new ID
      browserID = this.generateBrowserID();
      this.setBrowserID(browserID);
    }
    
    return browserID;
  }
  
  /**
   * Set browser ID in both localStorage and cookie
   * @param {string} id - Browser ID to set
   */
  static setBrowserID(id: string): void {
    this.setToLocalStorage(id);
    this.setCookie(this.COOKIE_NAME, id, 365); // 1 year
  }
  
  /**
   * Generate a new browser ID
   * @returns {string} New browser ID
   */
  private static generateBrowserID(): string {
    // Use crypto.randomUUID if available, otherwise fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * Get browser ID from localStorage
   * @returns {string | null} Browser ID or null
   */
  private static getFromLocalStorage(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
    }
    return null;
  }
  
  /**
   * Set browser ID to localStorage
   * @param {string} id - Browser ID to set
   */
  private static setToLocalStorage(id: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, id);
      }
    } catch (error) {
      console.warn('Failed to set localStorage:', error);
    }
  }
  
  /**
   * Get cookie value
   * @param {string} name - Cookie name
   * @returns {string | null} Cookie value or null
   */
  private static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue || null;
    }
    return null;
  }
  
  /**
   * Set cookie
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} days - Expiration in days
   */
  private static setCookie(name: string, value: string, days: number): void {
    if (typeof document === 'undefined') return;
    
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Strict; Secure`;
  }
  
  /**
   * Clear browser ID from storage
   */
  static clearBrowserID(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
    
    // Clear cookie
    if (typeof document !== 'undefined') {
      document.cookie = `${this.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  }
  
  /**
   * Check if browser ID exists
   * @returns {boolean} True if browser ID exists
   */
  static hasBrowserID(): boolean {
    return !!this.getFromLocalStorage() || !!this.getCookie(this.COOKIE_NAME);
  }
}