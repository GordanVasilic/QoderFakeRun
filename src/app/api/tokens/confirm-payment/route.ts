import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { stripeService } from '@/lib/stripe';
import { tokenService } from '@/lib/tokens';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { z } from 'zod';
import { db } from '@/lib/prisma';

const prisma = db;

// Validation schema
const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string(),
  paymentId: z.string(),
  anonymousId: z.string().optional(),
});

// Confirm payment and add tokens to user account
export async function POST(request: NextRequest) {
  let body: any;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 5, clientIP);
    
    // Parse and validate request
    body = await request.json();
    console.log('🔍 [POST /api/tokens/confirm-payment] Received request body:', JSON.stringify(body, null, 2));
    
    const validatedData = ConfirmPaymentSchema.parse(body);
    console.log('✅ [POST /api/tokens/confirm-payment] Validation successful:', JSON.stringify(validatedData, null, 2));
    
    // Check if user is authenticated
    const user = await isAuthenticated(request);
    
    // Get the payment transaction from database
    const paymentTransaction = await prisma.paymentTransaction.findUnique({
      where: { id: validatedData.paymentId }
    });
    
    if (!paymentTransaction) {
      return NextResponse.json({
        success: false,
        error: 'Payment transaction not found'
      }, { status: 404 });
    }
    
    if (paymentTransaction.status === 'COMPLETED') {
      return NextResponse.json({
        success: false,
        error: 'Payment already processed'
      }, { status: 400 });
    }
    
    // In a real implementation, you would confirm the payment with Stripe
    // For now, we'll simulate a successful confirmation
    console.log('Simulating payment confirmation for:', validatedData.paymentIntentId);
    
    try {
      // Update payment status to completed
      await prisma.paymentTransaction.update({
        where: { id: validatedData.paymentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          providerTransactionId: validatedData.paymentIntentId
        }
      });
      
      // Add tokens to user account
      let tokenAddResult = false;
      
      try {
        if (user && paymentTransaction.userId) {
          // Add tokens to authenticated user
          console.log('🔍 Adding tokens to authenticated user:', paymentTransaction.userId, 'tokens:', paymentTransaction.tokensPurchased);
          tokenAddResult = await tokenService.addTokensToUser(
            paymentTransaction.userId, 
            paymentTransaction.tokensPurchased
          );
          console.log('✅ Authenticated user token addition result:', tokenAddResult);
        } else if (paymentTransaction.anonymousId || validatedData.anonymousId) {
          // Add tokens to anonymous user
          const anonymousId = paymentTransaction.anonymousId || validatedData.anonymousId!;
          console.log('🔍 Adding tokens to anonymous user:', anonymousId, 'tokens:', paymentTransaction.tokensPurchased);
          tokenAddResult = await tokenService.addTokensToAnonymousUser(
            anonymousId, 
            paymentTransaction.tokensPurchased
          );
          console.log('✅ Anonymous user token addition result:', tokenAddResult);
        } else {
          console.error('❌ No user ID or anonymous ID found for token addition');
          tokenAddResult = false;
        }
      } catch (tokenError) {
        console.error('❌ Error during token addition:', tokenError);
        tokenAddResult = false;
      }
      
      if (!tokenAddResult) {
        console.error('❌ Token addition failed, rolling back payment');
        // Rollback payment status if token addition failed
        await prisma.paymentTransaction.update({
          where: { id: validatedData.paymentId },
          data: {
            status: 'FAILED'
          }
        });
        
        return NextResponse.json({
          success: false,
          error: 'Failed to add tokens to account'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          paymentId: validatedData.paymentId,
          tokensAdded: paymentTransaction.tokensPurchased,
          message: `Successfully added ${paymentTransaction.tokensPurchased} tokens to your account`
        }
      });
      
    } catch (error) {
      console.error('Error processing payment confirmation:', error);
      
      // Update payment status to failed
      await prisma.paymentTransaction.update({
        where: { id: validatedData.paymentId },
        data: {
          status: 'FAILED'
        }
      });
      
      return NextResponse.json({
        success: false,
        error: 'Payment processing failed'
      }, { status: 500 });
    }
    
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
      console.error('❌ [POST /api/tokens/confirm-payment] Validation error:', {
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
    
    console.error('Confirm payment error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to confirm payment',
      code: 'CONFIRM_PAYMENT_ERROR'
    }, { status: 500 });
  }
}