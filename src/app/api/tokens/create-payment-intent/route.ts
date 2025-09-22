import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { stripeService } from '@/lib/stripe';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { z } from 'zod';

// Validation schema
const CreatePaymentIntentSchema = z.object({
  packageId: z.string(),
  anonymousId: z.string().optional(),
});

// Create payment intent for direct payment in modal
export async function POST(request: NextRequest) {
  let body: any;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 10, clientIP);
    
    // Parse and validate request
    body = await request.json();
    console.log('🔍 [POST /api/tokens/create-payment-intent] Received request body:', JSON.stringify(body, null, 2));
    
    const validatedData = CreatePaymentIntentSchema.parse(body);
    console.log('✅ [POST /api/tokens/create-payment-intent] Validation successful:', JSON.stringify(validatedData, null, 2));
    
    // Check if user is authenticated
    const user = await isAuthenticated(request);
    let anonymousId = validatedData.anonymousId;
    
    // For anonymous users, generate anonymousId if not provided
    if (!user && !anonymousId) {
      // Generate a simple anonymous ID
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    // Create payment intent
    const result = await stripeService.createPaymentIntent({
      packageId: validatedData.packageId,
      userId: user?.id,
      anonymousId
    });
    
    if ('error' in result) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
    
    // Return payment intent details
    const response: any = {
      success: true,
      data: {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        paymentId: result.paymentId,
        amount: result.amount,
        packageName: result.packageName,
        tokens: result.tokens
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
    if (error instanceof z.ZodError) {
      console.error('❌ [POST /api/tokens/create-payment-intent] Validation error:', {
        issues: error.issues,
        receivedData: body
      });
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: error.issues
      }, { status: 400 });
    }
    
    console.error('Create payment intent error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create payment intent',
      code: 'PAYMENT_INTENT_ERROR'
    }, { status: 500 });
  }
}