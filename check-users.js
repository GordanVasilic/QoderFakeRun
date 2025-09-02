const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking existing users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    
    console.log('Existing users:', users);
    
    if (users.length === 0) {
      console.log('No users found. Creating admin user...');
      
      const adminUser = await prisma.user.create({
        data: {
          id: 'admin-temp-id',
          email: 'admin@qoderfakerun.com',
          role: 'ADMIN',
          name: 'Admin User'
        }
      });
      
      console.log('Created admin user:', adminUser);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();