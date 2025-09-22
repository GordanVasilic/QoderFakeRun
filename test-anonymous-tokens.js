const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAnonymousTokens() {
  try {
    console.log('Testing anonymous tokens table...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if anonymous_tokens table exists and is accessible
    const records = await prisma.anonymousToken.findMany({
      take: 5
    });
    
    console.log('✅ Anonymous tokens table accessible');
    console.log('Found records:', records.length);
    console.log('Sample records:', records);
    
    // Test the exact anonymousId from the error
    const testAnonymousId = 'test-user-1757355233020';
    console.log('\n--- Testing with specific anonymousId ---');
    
    const existingRecord = await prisma.anonymousToken.findUnique({
      where: { anonymousId: testAnonymousId }
    });
    
    console.log('Existing record for', testAnonymousId, ':', existingRecord);
    
    // Test creating a new record
    console.log('\n--- Testing token addition ---');
    const newAnonymousId = `test-${Date.now()}`;
    
    try {
      const newRecord = await prisma.anonymousToken.create({
        data: {
          anonymousId: newAnonymousId,
          tokenBalance: 10,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
      
      console.log('✅ Successfully created new record:', newRecord);
      
      // Clean up test record
      await prisma.anonymousToken.delete({
        where: { id: newRecord.id }
      });
      
      console.log('✅ Test record cleaned up');
      
    } catch (createError) {
      console.error('❌ Error creating record:', createError);
    }
    
    console.log('\n✅ All anonymous tokens tests completed!');
    
  } catch (error) {
    console.error('❌ Error testing anonymous tokens:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  } finally {
    await prisma.$disconnect();
  }
}

testAnonymousTokens();