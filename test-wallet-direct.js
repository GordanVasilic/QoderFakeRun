const { PrismaClient } = require('@prisma/client');

async function testWalletQuery() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing wallet query for anonymousId: test-user-1757355233020');
    
    const completedPurchases = await prisma.paymentTransaction.findMany({
      where: {
        anonymousId: 'test-user-1757355233020',
        status: 'COMPLETED'
      },
      select: {
        tokensPurchased: true
      }
    });
    
    console.log('✅ Query successful, found transactions:', completedPurchases.length);
    console.log('Transactions:', completedPurchases);
    
    const totalTokens = completedPurchases.reduce((sum, purchase) => sum + purchase.tokensPurchased, 0);
    console.log('Total tokens:', totalTokens);
    
    const lastPurchase = await prisma.paymentTransaction.findFirst({
      where: {
        anonymousId: 'test-user-1757355233020',
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    });
    
    console.log('Last purchase:', lastPurchase);
    
    const response = {
      balance: totalTokens,
      email_linked: false,
      last_purchase: lastPurchase?.createdAt || null
    };
    
    console.log('✅ Final response:', response);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      stack: error.stack
    });
  } finally {
    await prisma.$disconnect();
  }
}

testWalletQuery();