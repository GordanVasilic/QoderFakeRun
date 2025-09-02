const jwt = require('jsonwebtoken');

// Use the same JWT secret as in auth.ts and .env.local
const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-secret-key-here';

// Create admin user payload matching the database
const adminUser = {
  id: 'cmeu1kwjg0000w5zgh3xdrxma',
  email: 'admin@qoderfakerun.com',
  username: 'gogo',
  role: 'ADMIN',
  tokenBalance: 9999
};

console.log('🔑 JWT_SECRET:', JWT_SECRET);
console.log('👤 Admin user payload:', adminUser);

// Generate token
const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '7d' });
console.log('🎫 Generated token:', token);

// Verify token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verification successful:', decoded);
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
}

// Test PowerShell command
console.log('\n🚀 PowerShell test command:');
console.log(`$token = "${token}"`);
console.log('$body = \'{"name":"Test Route","description":"Test route creation","routeData":{"points":[{"lat":44.8125,"lng":20.4612,"elevation":100},{"lat":44.8135,"lng":20.4622,"elevation":105}],"distance":1000,"duration":600,"elevationGain":50,"averagePace":6},"activityType":"run","isPublic":true,"tags":["test"],"chartData":[{"distance":0,"pace":6,"elevation":100},{"distance":1000,"pace":6,"elevation":105}],"date":"2025-08-27","startTime":"10:00"}\'')
console.log('Invoke-RestMethod -Uri "http://localhost:3000/api/routes" -Method POST -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token" } -Body $body');