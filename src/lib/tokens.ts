import { getPrismaClient } from './prisma';
import { randomBytes } from 'crypto';

// Token packages available for purchase
const TOKEN_PACKAGES = [
  { id: 'basic', name: 'Basic Package', tokens: 10, price: 499 }, // $4.99
  { id: 'standard', name: 'Standard Package', tokens: 25, price: 999 }, // $9.99
  { id: 'premium', name: 'Premium Package', tokens: 50, price: 1799 }, // $17.99
  { id: 'pro', name: 'Pro Package', tokens: 100, price: 2999 }, // $29.99
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
  async addTokensToUser(userId: string, tokenCount: number): Promise<boolean> {
    try {
      await getPrismaClient().user.update({
        where: { id: userId },
        data: {
          tokenBalance: {
            increment: tokenCount
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
      const user = await getPrismaClient().user.findUnique({
        where: { id: userId },
        select: { tokenBalance: true }
      });
      
      return user ? user.tokenBalance >= requiredTokens : false;
    } catch (error) {
      console.error('Error checking user token balance:', error);
      return false;
    }
  },

  // Deduct tokens from a user account
  async deductTokensFromUser(userId: string, tokenCount = 1): Promise<boolean> {
    try {
      const user = await getPrismaClient().user.findUnique({
        where: { id: userId },
        select: { tokenBalance: true }
      });
      
      if (!user || user.tokenBalance < tokenCount) {
        return false;
      }
      
      await getPrismaClient().user.update({
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
    try {
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ANONYMOUS_TOKEN_EXPIRY_DAYS);
      
      // Check if anonymous user already exists
      const existing = await getPrismaClient().anonymousToken.findUnique({
        where: { anonymousId }
      });
      
      if (existing) {
        // Update existing record
        await getPrismaClient().anonymousToken.update({
          where: { anonymousId },
          data: {
            tokenBalance: {
              increment: tokenCount
            },
            expiresAt,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new record
        await getPrismaClient().anonymousToken.create({
          data: {
            anonymousId,
            tokenBalance: tokenCount,
            expiresAt
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error adding tokens to anonymous user:', error);
      return false;
    }
  },
  
  // Check anonymous token balance
  async checkAnonymousTokenBalance(anonymousId: string, requiredTokens = 1): Promise<boolean> {
    try {
      const record = await getPrismaClient().anonymousToken.findUnique({
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
  
  // Deduct tokens from anonymous user
  async deductTokensFromAnonymousUser(anonymousId: string, tokenCount = 1): Promise<boolean> {
    try {
      const record = await getPrismaClient().anonymousToken.findUnique({
        where: { anonymousId }
      });
      
      if (!record || record.expiresAt <= new Date() || record.tokenBalance < tokenCount) {
        return false;
      }
      
      await getPrismaClient().anonymousToken.update({
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
      await getPrismaClient().routeDownload.create({
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
      const record = await getPrismaClient().anonymousToken.findUnique({
        where: { anonymousId }
      });
      
      if (!record || record.expiresAt <= new Date() || record.tokenBalance <= 0) {
        return false;
      }
      
      // Begin transaction
      await getPrismaClient().$transaction([
        // Add tokens to user
        getPrismaClient().user.update({
          where: { id: userId },
          data: {
            tokenBalance: {
              increment: record.tokenBalance
            }
          }
        }),
        
        // Delete anonymous token record
        getPrismaClient().anonymousToken.delete({
          where: { anonymousId }
        }),
        
        // Update any download records
        getPrismaClient().routeDownload.updateMany({
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