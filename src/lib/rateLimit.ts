import { NextRequest, NextResponse } from 'next/server'
import { LRUCache } from 'lru-cache'

type Options = {
  uniqueTokenPerInterval?: number
  interval?: number
}

export default function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000, // 1 minute
  })

  return {
    check: (request: NextRequest, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0]
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount)
        }
        tokenCount[0] += 1

        const currentUsage = tokenCount[0]
        const isRateLimited = currentUsage >= limit
        
        if (isRateLimited) {
          reject(new Error('Rate limit exceeded'))
        } else {
          resolve()
        }
      }),
  }
}

// Helper function to get client IP
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

// Rate limiting configuration
export const rateLimitConfig = {
  // General API requests
  general: {
    limit: 100, // requests per interval
    interval: 60000, // 1 minute
  },
  // File generation (more restrictive)
  fileGeneration: {
    limit: 10, // files per interval
    interval: 60000, // 1 minute
  },
  // Route creation
  routeCreation: {
    limit: 50, // routes per interval
    interval: 60000, // 1 minute
  },
  // Authentication
  auth: {
    limit: 5, // login attempts per interval
    interval: 900000, // 15 minutes
  }
}

// Create rate limiters for different endpoints
export const generalLimiter = rateLimit({
  interval: rateLimitConfig.general.interval,
  uniqueTokenPerInterval: 500,
})

export const fileLimiter = rateLimit({
  interval: rateLimitConfig.fileGeneration.interval,
  uniqueTokenPerInterval: 200,
})

export const routeLimiter = rateLimit({
  interval: rateLimitConfig.routeCreation.interval,
  uniqueTokenPerInterval: 300,
})

export const authLimiter = rateLimit({
  interval: rateLimitConfig.auth.interval,
  uniqueTokenPerInterval: 100,
})