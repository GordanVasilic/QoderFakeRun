const jwt = require('jsonwebtoken');

// Use the same JWT_SECRET logic as auth.ts
const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

console.log('JWT_SECRET being used:', JWT_SECRET);

// Create the same payload as in the test
const adminPayload = {
  id: 'admin-temp-id',
  email: 'admin@qoderfakerun.com',
  role: 'ADMIN',
  tokenBalance: 9999
};

console.log('Creating token with payload:', adminPayload);

// Generate token
const token = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '7d' });
console.log('Generated token:', token);

// Verify token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verification successful:', decoded);
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
}

// Test with the token from our test script
const testToken = jwt.sign(adminPayload, JWT_SECRET);
console.log('\nTest token (no expiry):', testToken);

try {
  const decodedTest = jwt.verify(testToken, JWT_SECRET);
  console.log('✅ Test token verification successful:', decodedTest);
} catch (error) {
  console.error('❌ Test token verification failed:', error.message);
}