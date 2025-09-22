// Test the wallet API route directly
const { PrismaClient } = require('@prisma/client');

// Mock the db import
const db = new PrismaClient();

// Mock NextResponse
const NextResponse = {
  json: (data, options = {}) => ({
    json: () => Promise.resolve(data),
    status: options.status || 200,
    data
  })
};

// Copy the GET function logic from the route
async function testWalletAPI() {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🔍 [${requestId}] Wallet API called at ${new Date().toISOString()}`);
  
  try {
    const mockUrl = 'http://localhost:3000/api/tokens/wallet?anonymousId=test-user-1757355233020';
    const { searchParams } = new URL(mockUrl);
    const anonymousId = searchParams.get('anonymousId');

    console.log(`🔍 [${requestId}] Wallet API called with anonymousId:`, anonymousId);

    if (!anonymousId) {
      console.log(`❌ [${requestId}] Missing anonymousId in request`);
      return NextResponse.json(
        { error: 'Anonymous ID is required' },
        { status: 400 }
      );
    }

    // Query payment transactions for this anonymous user
    console.log(`🔍 [${requestId}] Querying transactions for anonymousId:`, anonymousId);
    const completedPurchases = await db.paymentTransaction.findMany({
      where: {
        anonymousId,
        status: 'COMPLETED'
      },
      select: {
        tokensPurchased: true
      }
    });
    console.log(`✅ [${requestId}] Found transactions:`, completedPurchases.length);

    const totalTokens = completedPurchases.reduce((sum, purchase) => sum + purchase.tokensPurchased, 0);
    console.log(`🔍 [${requestId}] Calculated total tokens:`, totalTokens);
    
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
      balance: totalTokens,
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
      code: error?.code || 'No code'
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
  } finally {
    await db.$disconnect();
  }
}

testWalletAPI().then(result => {
  console.log('Final result:', result);
}).catch(error => {
  console.error('Test failed:', error);
});