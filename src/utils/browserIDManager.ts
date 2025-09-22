/**
 * Browser ID Manager - Manages unique browser identification for token system
 * Uses localStorage with UUID fallback for anonymous user tracking
 */

import { v4 as uuidv4 } from 'uuid';

const BROWSER_ID_KEY = 'qoder_browser_id';
const BROWSER_ID_BACKUP_KEY = 'qoder_browser_id_backup';

export class BrowserIDManager {
  private static instance: BrowserIDManager;
  private browserId: string | null = null;

  private constructor() {}

  public static getInstance(): BrowserIDManager {
    if (!BrowserIDManager.instance) {
      BrowserIDManager.instance = new BrowserIDManager();
    }
    return BrowserIDManager.instance;
  }

  /**
   * Get or create browser ID
   */
  public getBrowserID(): string {
    if (this.browserId) {
      return this.browserId;
    }

    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      let storedId = localStorage.getItem(BROWSER_ID_KEY);
      
      if (!storedId) {
        // Try backup key
        storedId = localStorage.getItem(BROWSER_ID_BACKUP_KEY);
        if (storedId) {
          // Restore from backup
          localStorage.setItem(BROWSER_ID_KEY, storedId);
        }
      }

      if (!storedId) {
        // Generate new ID
        storedId = uuidv4();
        this.saveBrowserID(storedId);
      }

      this.browserId = storedId;
      return storedId;
    }

    // Fallback for SSR
    const newId = uuidv4();
    this.browserId = newId;
    return newId;
  }

  /**
   * Save browser ID to localStorage with backup
   */
  private saveBrowserID(id: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BROWSER_ID_KEY, id);
      localStorage.setItem(BROWSER_ID_BACKUP_KEY, id);
    }
  }

  /**
   * Reset browser ID (for testing or user request)
   */
  public resetBrowserID(): string {
    const newId = uuidv4();
    this.browserId = newId;
    this.saveBrowserID(newId);
    return newId;
  }

  /**
   * Check if browser ID exists in storage
   */
  public hasBrowserID(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(localStorage.getItem(BROWSER_ID_KEY) || localStorage.getItem(BROWSER_ID_BACKUP_KEY));
  }

  /**
   * Get browser fingerprint for additional security
   */
  public getBrowserFingerprint(): string {
    if (typeof window === 'undefined') return 'ssr';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const browserIDManager = BrowserIDManager.getInstance();