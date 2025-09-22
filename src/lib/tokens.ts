import { db } from './prisma';
import { randomBytes } from 'crypto';
// Import pg only on server side
let Pool: any;
if (typeof window === 'undefined') {
  Pool = require('pg').Pool;
}

// Token package type definition
export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  popular?: boolean;
}

// Token packages available for purchase
const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'starter', name: 'Start', tokens: 3, price: 200 }, // $2.00 - 3 tokens
  { id: 'popular', name: 'Popular', tokens: 10, price: 500, popular: true }, // $5.00 - 10 tokens
  { id: 'pro', name: 'Pro', tokens: 20, price: 900 }, // $9.00 - 20 tokens
  { id: 'ultimate', name: 'Ultimate', tokens: 50, price: 1500 }, // $15.00 - 50 tokens
];

const ANONYMOUS_TOKEN_EXPIRY_DAYS = 30; // Anonymous tokens expire after 30 days

export const tokenService = {
  // Get available token packages
  getTokenPackages() {
    return TOKEN_PACKAGES;
  },

  // Get a specific token package by ID
  getTokenPackageById(id: string) {
    return TOKEN_PACKAGES.find(pkg => pkg.id === id);
  },

  // Add tokens to a user account
  async addTokensToUser(userId: string, tokens: number): Promise<boolean> {
    try {
      const user = await db.user.update({
        where: { id: userId },
        data: {
          tokenBalance: {
            increment: tokens
          }
        }
      });
      return true;
    } catch (error) {
      console.error('Error adding tokens to user:', error);
      return false;
    }
  },

  // Check if a user has enough tokens
  async checkUserTokenBalance(userId: string, requiredTokens = 1): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { tokenBalance: true }
      });
      
      return user ? user.tokenBalance >= requiredTokens : false;
    } catch (error) {
      console.error('Error checking user token balance:', error);
      return false;
    }
  },

  // Get user's actual token balance
  async getUserTokenBalance(userId: string): Promise<number> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { tokenBalance: true }
      });
      
      return user ? user.tokenBalance : 0;
    } catch (error) {
      console.error('Error getting user token balance:', error);
      return 0;
    }
  },

  // Deduct tokens from a user account
  async deductTokensFromUser(userId: string, tokenCount = 1): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { tokenBalance: true }
      });
      
      if (!user || user.tokenBalance < tokenCount) {
        return false;
      }
      
      await db.user.update({
        where: { id: userId },
        data: {
          tokenBalance: {
            decrement: tokenCount
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error deducting tokens from user:', error);
      return false;
    }
  },
  
  // Generate a unique anonymous ID for non-registered users
  generateAnonymousId(): string {
    return randomBytes(16).toString('hex');
  },
  
  // Create or update anonymous token balance
  async addTokensToAnonymousUser(anonymousId: string, tokenCount: number): Promise<boolean> {
    // Only run on server side
    if (typeof window !== 'undefined') {
      console.error('addTokensToAnonymousUser should only be called on server side');
      return false;
    }
    
    let pool: any = null;
    try {
      console.debug('🔍 Adding tokens to anonymous user:', { anonymousId, tokens: tokenCount });
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + ANONYMOUS_TOKEN_EXPIRY_DAYS);
      
      // Create direct PostgreSQL connection to bypass Prisma
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // Increased from 2000 to 10000ms
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      const client = await pool.connect();
      
      try {
        // Check if anonymous user already exists using direct query
        const existingResult = await client.query(
          'SELECT id, "tokenBalance" FROM anonymous_tokens WHERE "anonymousId" = $1',
          [anonymousId]
        );
        
        if (existingResult.rows.length > 0) {
          // Update existing record
          await client.query(
            'UPDATE anonymous_tokens SET "tokenBalance" = "tokenBalance" + $1, "expiresAt" = $2, "updatedAt" = NOW() WHERE "anonymousId" = $3',
            [tokenCount, expiryDate, anonymousId]
          );
        } else {
          // Create new record
          const id = randomBytes(12).toString('base64url');
          await client.query(
            'INSERT INTO anonymous_tokens (id, "anonymousId", "tokenBalance", "expiresAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
            [id, anonymousId, tokenCount, expiryDate]
          );
        }
        
        return true;
      } catch (queryError) {
        console.error('Database query error:', queryError);
        throw queryError;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error adding tokens to anonymous user:', error);
      return false;
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  },
  
  // Check anonymous token balance
  async checkAnonymousTokenBalance(anonymousId: string, requiredTokens = 1): Promise<boolean> {
    try {
      const record = await db.anonymousToken.findUnique({
        where: { anonymousId }
      });
      
      // Check if record exists, hasn't expired, and has enough tokens
      return !!(record && 
                record.expiresAt > new Date() && 
                record.tokenBalance >= requiredTokens);
    } catch (error) {
      console.error('Error checking anonymous token balance:', error);
      return false;
    }
  },

  // Get anonymous user's actual token balance
  async getAnonymousTokenBalance(anonymousId: string): Promise<number> {
    try {
      const record = await db.anonymousToken.findUnique({
        where: { anonymousId }
      });
      
      // Return balance if record exists and hasn't expired
      return (record && record.expiresAt > new Date()) ? record.tokenBalance : 0;
    } catch (error) {
      console.error('Error getting anonymous token balance:', error);
      return 0;
    }
  },
  
  // Deduct tokens from anonymous user
  async deductTokensFromAnonymousUser(anonymousId: string, tokenCount = 1): Promise<boolean> {
    try {
      const record = await db.anonymousToken.findUnique({
        where: { anonymousId }
      });
      
      if (!record || record.expiresAt <= new Date() || record.tokenBalance < tokenCount) {
        return false;
      }
      
      await db.anonymousToken.update({
        where: { anonymousId },
        data: {
          tokenBalance: {
            decrement: tokenCount
          },
          updatedAt: new Date()
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error deducting tokens from anonymous user:', error);
      return false;
    }
  },
  
  // Track a download
  async trackDownload(data: {
    routeId: string,
    userId?: string,
    anonymousId?: string,
    format: 'GPX' | 'TCX' | 'KML' | 'JSON',
    tokensUsed?: number,
    ipAddress?: string,
    userAgent?: string
  }): Promise<boolean> {
    try {
      await db.routeDownload.create({
        data: {
          routeId: data.routeId,
          userId: data.userId,
          anonymousId: data.anonymousId,
          format: data.format,
          tokensUsed: data.tokensUsed || 1,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error tracking download:', error);
      return false;
    }
  },
  
  // Transfer tokens from anonymous to registered user
  async transferAnonymousTokens(anonymousId: string, userId: string): Promise<boolean> {
    try {
      const record = await db.anonymousToken.findUnique({
        where: { anonymousId }
      });
      
      if (!record || record.expiresAt <= new Date() || record.tokenBalance <= 0) {
        return false;
      }
      
      // Begin transaction
      await db.$transaction([
        // Add tokens to user
        db.user.update({
          where: { id: userId },
          data: {
            tokenBalance: {
              increment: record.tokenBalance
            }
          }
        }),
        
        // Delete anonymous token record
        db.anonymousToken.delete({
          where: { anonymousId }
        }),
        
        // Update any download records
        db.routeDownload.updateMany({
          where: { anonymousId },
          data: { userId, anonymousId: null }
        })
      ]);
      
      return true;
    } catch (error) {
      console.error('Error transferring anonymous tokens:', error);
      return false;
    }
  },
};

export default tokenService;