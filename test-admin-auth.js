const jwt = require('jsonwebtoken');

// Test admin authentication
async function testAdminAuth() {
  console.log('Testing admin authentication...');
  
  // Create admin token manually
  const adminUser = {
    id: 'cmeu1kwjg0000w5zgh3xdrxma',
    email: 'admin@qoderfakerun.com',
    role: 'ADMIN',
    tokenBalance: 1000
  };
  
  const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  
  console.log('JWT_SECRET:', JWT_SECRET);
  
  const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '7d' });
  console.log('Generated admin token:', token.substring(0, 50) + '...');
  
  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verification successful for user:', decoded.email);
    console.log('✅ User ID:', decoded.id);
    console.log('✅ User role:', decoded.role);
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return;
  }
  
  console.log('\n🔧 To test route creation, run this curl command:');
  console.log(`curl -X POST http://localhost:3000/api/routes \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "Authorization: Bearer ${token}" \\`);
  console.log(`  -d '{`);
  console.log(`    "name": "Test Admin Route",`);
  console.log(`    "description": "Testing admin route creation",`);
  console.log(`    "geometry": {`);
  console.log(`      "type": "LineString",`);
  console.log(`      "coordinates": [[20.4612, 44.8125], [20.4622, 44.8135]]`);
  console.log(`    },`);
  console.log(`    "distance": 1000,`);
  console.log(`    "duration": 600,`);
  console.log(`    "elevationGain": 50,`);
  console.log(`    "averagePace": 360,`);
  console.log(`    "activityType": "RUNNING",`);
  console.log(`    "pointCount": 2,`);
  console.log(`    "minElevation": 100,`);
  console.log(`    "maxElevation": 150,`);
  console.log(`    "isPublic": true,`);
  console.log(`    "isTemplate": false,`);
  console.log(`    "difficulty": "EASY"`);
  console.log(`  }'`);
}

testAdminAuth().catch(console.error);