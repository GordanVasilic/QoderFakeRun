/**
 * Rate Limiter Middleware - Implements security measures and rate limiting
 * Protects API endpoints from abuse and ensures fair usage
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting (in production, use Redis)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
const RATE_LIMITS = {
  // Token operations
  '/api/tokens/wallet': { requests: 60, window: 60000 }, // 60 requests per minute
  '/api/tokens/redeem': { requests: 10, window: 60000 }, // 10 requests per minute
  '/api/tokens/create-checkout-session': { requests: 5, window: 60000 }, // 5 requests per minute
  '/api/tokens/stripe-webhook': { requests: 100, window: 60000 }, // 100 requests per minute (Stripe)
  
  // Default rate limit
  default: { requests: 30, window: 60000 } // 30 requests per minute
};

// Security headers for API requests
const API_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN', // Less restrictive for API calls
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get browser ID from headers first
  const browserId = request.headers.get('x-browser-id');
  if (browserId) {
    return `browser:${browserId}`;
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
    request.headers.get('x-real-ip') || 
    'unknown';
  
  return `ip:${ip}`;
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if request should be rate limited
 */
function isRateLimited(clientId: string, endpoint: string): {
  limited: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupExpiredEntries();
  }
  
  const config = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
  const key = `${clientId}:${endpoint}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + config.window
    };
    rateLimitStore.set(key, entry);
    
    return {
      limited: false,
      remaining: config.requests - 1,
      resetTime: entry.resetTime,
      limit: config.requests
    };
  }
  
  entry.count++;
  
  return {
    limited: entry.count > config.requests,
    remaining: Math.max(0, config.requests - entry.count),
    resetTime: entry.resetTime,
    limit: config.requests
  };
}

/**
 * Validate request for security issues
 */
function validateRequest(request: NextRequest): { valid: boolean; error?: string } {
  const url = new URL(request.url);
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript protocol
  ];
  
  const fullUrl = url.pathname + url.search;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl)) {
      return { valid: false, error: 'Suspicious request pattern detected' };
    }
  }
  
  // Validate content length for POST requests
  if (request.method === 'POST') {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      return { valid: false, error: 'Request too large' };
    }
  }
  
  return { valid: true };
}

/**
 * Main rate limiter middleware
 */
export function rateLimiter(request: NextRequest): NextResponse | null {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  
  // Skip rate limiting for non-API routes
  if (!endpoint.startsWith('/api/')) {
    return null;
  }
  
  // Validate request security
  const validation = validateRequest(request);
  if (!validation.valid) {
    console.warn(`Blocked suspicious request: ${validation.error}`, {
      url: endpoint,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent')
    });
    
    return new NextResponse(
        JSON.stringify({ error: 'Request blocked for security reasons' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...API_SECURITY_HEADERS
          }
        }
      );
  }
  
  // Apply rate limiting
  const clientId = getClientId(request);
  const rateLimitResult = isRateLimited(clientId, endpoint);
  
  if (rateLimitResult.limited) {
    console.warn(`Rate limit exceeded for ${clientId} on ${endpoint}`);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          ...API_SECURITY_HEADERS
        }
      }
    );
  }
  
  // Add rate limit headers to successful requests
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
  
  // Add security headers
  Object.entries(API_SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Helper function to check if IP is from a trusted source (for webhooks)
 */
export function isTrustedIP(ip: string): boolean {
  // Stripe webhook IPs (update as needed)
  const trustedIPs = [
    '3.18.12.63',
    '3.130.192.231',
    '13.235.14.237',
    '13.235.122.149',
    '18.211.135.69',
    '35.154.171.200',
    '52.15.183.38',
    '54.88.130.119',
    '54.88.130.237',
    '54.187.174.169',
    '54.187.205.235',
    '54.187.216.72'
  ];
  
  // Allow localhost for development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return trustedIPs.includes(ip);
}

export default rateLimiter;