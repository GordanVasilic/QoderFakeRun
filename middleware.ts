/**
 * Next.js Middleware - Applies rate limiting and security measures
 * Runs on Edge Runtime for optimal performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from './src/middleware/rateLimiter';

export function middleware(request: NextRequest) {
  // Apply rate limiting and security checks
  const rateLimitResponse = rateLimiter(request);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // Continue to the next middleware or route handler
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and internal Next.js routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};