const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test querying the PaymentTransaction table
    console.log('🔍 Testing PaymentTransaction query...');
    const testAnonymousId = 'anon_test_' + Date.now();
    
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        anonymousId: testAnonymousId,
        status: 'COMPLETED'
      },
      select: {
        tokensPurchased: true
      }
    });
    
    console.log('✅ PaymentTransaction query successful, found:', transactions.length, 'transactions');
    
    // Test the exact query from the wallet API
    console.log('🔍 Testing wallet API query with existing anonymousId...');
    const existingTransactions = await prisma.paymentTransaction.findMany({
      where: {
        anonymousId: 'anon_1737230979422_abc123',
        status: 'COMPLETED'
      },
      select: {
        tokensPurchased: true
      }
    });
    
    console.log('✅ Existing transactions found:', existingTransactions.length);
    
    // Test the last purchase query
    const lastPurchase = await prisma.paymentTransaction.findFirst({
      where: {
        anonymousId: 'anon_1737230979422_abc123',
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    });
    
    console.log('✅ Last purchase query successful:', lastPurchase ? 'found' : 'not found');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  }
}

testDatabaseConnection();