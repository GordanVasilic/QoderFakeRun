import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/prisma';

export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🔍 [${requestId}] Wallet API called at ${new Date().toISOString()}`);
  
  try {
    const { searchParams } = new URL(request.url);
    const anonymousId = searchParams.get('anonymousId');

    console.log(`🔍 [${requestId}] Wallet API called with anonymousId:`, anonymousId);

    if (!anonymousId) {
      console.log(`❌ [${requestId}] Missing anonymousId in request`);
      return NextResponse.json(
        { error: 'Anonymous ID is required' },
        { status: 400 }
      );
    }

    // Query the anonymous_tokens table for current balance (accounts for purchases AND deductions)
    console.log(`🔍 [${requestId}] Querying anonymous_tokens for anonymousId:`, anonymousId);
    const anonymousToken = await db.anonymousToken.findUnique({
      where: { anonymousId },
      select: {
        tokenBalance: true,
        expiresAt: true,
        updatedAt: true
      }
    });
    console.log(`✅ [${requestId}] Anonymous token record:`, anonymousToken ? 'found' : 'not found');

    let currentBalance = 0;
    if (anonymousToken && anonymousToken.expiresAt > new Date()) {
      currentBalance = anonymousToken.tokenBalance;
      console.log(`🔍 [${requestId}] Current balance from anonymous_tokens:`, currentBalance);
    } else {
      console.log(`🔍 [${requestId}] No valid anonymous token record found, balance: 0`);
    }
    
    // Get the most recent purchase for last_purchase date
    console.log(`🔍 [${requestId}] Querying last purchase...`);
    const lastPurchase = await db.paymentTransaction.findFirst({
      where: {
        anonymousId,
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    });
    console.log(`✅ [${requestId}] Last purchase query completed:`, lastPurchase ? 'found' : 'not found');

    const response = {
      balance: currentBalance,
      email_linked: false, // Not implemented in new system yet
      last_purchase: lastPurchase?.createdAt || null
    };
    
    console.log(`✅ [${requestId}] Wallet API response:`, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`❌ [${requestId}] Error fetching wallet balance:`, error);
    console.error(`❌ [${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as Error & { code?: string })?.code || 'No code'
    });
    
    // More specific error handling
    let errorMessage = 'Failed to fetch wallet balance';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Database connection error';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Database query timeout';
        statusCode = 504; // Gateway Timeout
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Email linking functionality not implemented in new system yet
// POST endpoint removed - use the main tokens endpoint for purchases