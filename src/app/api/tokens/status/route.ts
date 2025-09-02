import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/stripe';
import { generalLimiter, getClientIP } from '@/lib/rateLimit';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    await generalLimiter.check(request, 20, clientIP);
    
    // Get payment ID from query params
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    
    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID is required'
      }, { status: 400 });
    }
    
    // Get payment status
    const result = await stripeService.getPaymentStatus(paymentId);
    
    if ('error' in result) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
    
    // Return payment status
    return NextResponse.json({
      success: true,
      data: {
        status: result.status,
        payment: result.payment
      }
    });
    
  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check payment status',
      code: 'STATUS_ERROR'
    }, { status: 500 });
  }
}