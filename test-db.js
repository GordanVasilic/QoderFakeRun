const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

async function testDatabase() {
  console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL);
  
  const prisma = new PrismaClient({
    log: ['query', 'error']
  });

  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test if PaymentTransaction table exists
    console.log('🔍 Testing PaymentTransaction table...');
    const count = await prisma.paymentTransaction.count();
    console.log(`✅ PaymentTransaction table exists with ${count} records`);
    
    // Test a sample query similar to the wallet API
    console.log('🔍 Testing wallet query...');
    const testAnonymousId = 'test-anonymous-id';
    const completedPurchases = await prisma.paymentTransaction.findMany({
      where: {
        anonymousId: testAnonymousId,
        status: 'COMPLETED'
      },
      select: {
        tokensPurchased: true
      }
    });
    console.log(`✅ Wallet query successful, found ${completedPurchases.length} purchases`);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  }
}

testDatabase().catch(console.error);