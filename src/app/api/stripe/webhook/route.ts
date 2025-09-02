import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // Get the signature from the headers
    const signature = request.headers.get('stripe-signature') || '';
    
    // Get the raw body
    const body = await request.text();
    
    // Handle the webhook event
    const result = await stripeService.handleWebhookEvent(body, signature);
    
    if ('error' in result) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      received: true
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook',
      code: 'WEBHOOK_ERROR'
    }, { status: 500 });
  }
}