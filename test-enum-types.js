const { PrismaClient } = require('@prisma/client');

async function checkEnumTypes() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking enum types in database...');
    
    // Check all enum types
    const enumTypes = await prisma.$queryRaw`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname IN ('activity_type', 'ActivityType', 'user_role', 'UserRole', 'difficulty_level', 'DifficultyLevel')
      ORDER BY t.typname, e.enumlabel;
    `;
    
    console.log('Available enum types and values:');
    enumTypes.forEach(row => {
      console.log(`  ${row.enum_name}: ${row.enum_value}`);
    });
    
    // Also check what types exist
    const allEnums = await prisma.$queryRaw`
      SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;
    `;
    
    console.log('\nAll enum types in database:');
    allEnums.forEach(row => {
      console.log(`  - ${row.typname}`);
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnumTypes();