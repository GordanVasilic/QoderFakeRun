import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { stripeService } from '@/lib/stripe';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { z } from 'zod';
import { tokenService } from '@/lib/tokens';

// Validation schema
const CreateCheckoutSessionSchema = z.object({
  packageId: z.string(),
  anonymousId: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 5, clientIP); // 5 requests per minute
    
    // Parse and validate request
    const body = await request.json();
    const validatedData = CreateCheckoutSessionSchema.parse(body);
    
    console.debug('=== CREATE CHECKOUT SESSION API ===');
    console.debug('Request data:', validatedData);
    
    // Check if user is authenticated
    const user = await isAuthenticated(request);
    let anonymousId = validatedData.anonymousId;
    
    console.debug('User authenticated:', !!user);
    console.debug('Anonymous ID provided:', anonymousId);
    
    // For anonymous users, ensure we have an anonymousId
    if (!user && !anonymousId) {
      anonymousId = tokenService.generateAnonymousId();
      console.debug('Generated new anonymous ID:', anonymousId);
    }
    
    // Create checkout session
    const result = await stripeService.createCheckoutSession({
      packageId: validatedData.packageId,
      userId: user?.id,
      anonymousId,
      successUrl: validatedData.successUrl,
      cancelUrl: validatedData.cancelUrl
    });
    
    console.debug('Stripe checkout session result:', result);
    
    if ('error' in result) {
      console.error('Checkout session creation failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    // Check if sessionUrl is available
    if (!result.sessionUrl) {
      console.error('Checkout session created but no URL returned');
      return NextResponse.json({
        success: false,
        error: 'Failed to create checkout session URL'
      }, { status: 500 });
    }

    // Return checkout session and anonymousId if applicable
    const response: {
      success: boolean;
      data: {
        sessionId: string;
        sessionUrl: string;
        paymentId: string;
        anonymousId?: string;
      };
    } = {
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
    
    console.debug('=== CHECKOUT SESSION CREATED SUCCESSFULLY ===');
    console.debug('Response:', response);
    
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
    
    console.error('Create checkout session error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create checkout session',
      code: 'CHECKOUT_SESSION_ERROR'
    }, { status: 500 });
  }
}