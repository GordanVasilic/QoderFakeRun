import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { tokenService } from '@/lib/tokens';
import { stripeService } from '@/lib/stripe';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { z } from 'zod';
import { db } from '@/lib/prisma';

const prisma = db;

// Validation schemas
const PurchaseTokensSchema = z.object({
  packageId: z.string(),
  anonymousId: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// Get token packages and user balance
export async function GET(request: NextRequest) {
  try {
    // Get token packages
    const packages = tokenService.getTokenPackages();
    
    // Check if user is authenticated
    const user = await isAuthenticated(request);
    
    // For authenticated users, include their token balance
    if (user) {
      return NextResponse.json({
        success: true,
        data: {
          packages,
          userTokens: user.tokenBalance
        }
      });
    }
    
    // For anonymous users
    const anonymousId = request.cookies.get('anonymousId')?.value;
    if (anonymousId) {
      const anonymousTokens = await prisma.anonymousToken.findUnique({
        where: { anonymousId }
      });
      
      if (anonymousTokens && anonymousTokens.expiresAt > new Date()) {
        return NextResponse.json({
          success: true,
          data: {
            packages,
            anonymousTokens: anonymousTokens.tokenBalance
          }
        });
      }
    }
    
    // Default response with just packages
    return NextResponse.json({
      success: true,
      data: { packages }
    });
    
  } catch (error) {
    console.error('Error getting token packages:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get token packages',
      code: 'TOKEN_PACKAGE_ERROR'
    }, { status: 500 });
  }
}

// Purchase tokens
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 10, clientIP);
    
    // Parse and validate request
    const body = await request.json();
    const validatedData = PurchaseTokensSchema.parse(body);
    
    // Check if user is authenticated
    const user = await isAuthenticated(request);
    let anonymousId = validatedData.anonymousId;
    
    // For anonymous users, generate or use existing anonymousId
    if (!user && !anonymousId) {
      anonymousId = tokenService.generateAnonymousId();
      
      // In a real app, you'd set this as a cookie or store in localStorage
      // Here we'll just include it in the response
    }
    
    // Create checkout session
    const result = await stripeService.createCheckoutSession({
      packageId: validatedData.packageId,
      userId: user?.id,
      anonymousId,
      successUrl: validatedData.successUrl,
      cancelUrl: validatedData.cancelUrl
    });
    
    if ('error' in result) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
    
    // Return checkout session and anonymousId if applicable
    const response: any = {
      success: true,
      data: {
        sessionId: result.sessionId,
        sessionUrl: result.sessionUrl,
        paymentId: result.paymentId
      }
    };
    
    // Include anonymousId for new anonymous users
    if (!user && anonymousId && !validatedData.anonymousId) {
      response.data.anonymousId = anonymousId;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    // Handle rate limiting
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json({
        success: false,
        error: 'Too many requests. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 });
    }
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: error.message
      }, { status: 400 });
    }
    
    console.error('Token purchase error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to purchase tokens',
      code: 'PURCHASE_ERROR'
    }, { status: 500 });
  }
}