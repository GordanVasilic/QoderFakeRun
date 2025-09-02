// Using built-in fetch (Node.js 18+)
const jwt = require('jsonwebtoken');

async function testRouteCreation() {
  // Generate admin JWT token for testing (using real admin user)
  const adminPayload = {
    id: 'cmeu1kwjg0000w5zgh3xdrxma',
    email: 'admin@qoderfakerun.com',
    role: 'ADMIN',
    tokenBalance: 9999
  };
  // Use the exact same JWT_SECRET logic as auth.ts
  const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  // Override with the actual secret from .env.local
  const ACTUAL_SECRET = 'your-secret-key-here';
  const adminToken = jwt.sign(adminPayload, ACTUAL_SECRET, { expiresIn: '7d' });
  
  console.log('🔑 Using JWT_SECRET:', JWT_SECRET);
  console.log('🔑 Using ACTUAL_SECRET:', ACTUAL_SECRET);
  console.log('🎫 Generated token:', adminToken);
  const testRoute = {
    name: "Test Route Fix",
    description: "Testing the fixed route creation",
    routeData: {
      distance: 5.0, // 5km (changed to match max 1000km validation)
      duration: 1800, // 30 minutes
      elevationGain: 100,
      averagePace: 6.0,
      points: [
        { lat: 40.7128, lng: -74.0060, elevation: 10 }, // New York
        { lat: 40.7589, lng: -73.9851, elevation: 15 }, // Times Square
        { lat: 40.7505, lng: -73.9934, elevation: 20 }  // Broadway
      ]
    },
    activityType: "run",
    isPublic: true,
    tags: ["test", "fix"],
    date: "2025-08-27",
    startTime: "14:30"
  };

  try {
    console.log('🧪 Testing route creation API endpoint...');
    console.log('📍 Test route data:', {
      name: testRoute.name,
      pointCount: testRoute.routeData.points.length,
      distance: testRoute.routeData.distance + 'm'
    });

    const response = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(testRoute)
    });

    const responseText = await response.text();
    console.log('\n📡 Response status:', response.status);
    console.log('📄 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ SUCCESS! Route created successfully:');
      console.log('   Route ID:', result.data.id);
      console.log('   Route Name:', result.data.name);
      console.log('   Created At:', result.data.createdAt);
      console.log('   Stats:', result.data.stats);
      return true;
    } else {
      console.log('❌ FAILED! Response body:', responseText);
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.details) {
          console.log('📋 Validation errors:', JSON.stringify(errorData.details, null, 2));
        }
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR during API test:', error.message);
    return false;
  }
}

testRouteCreation().then(success => {
  if (success) {
    console.log('\n🎉 Route creation API is working correctly!');
  } else {
    console.log('\n💥 Route creation API still has issues.');
  }
  process.exit(success ? 0 : 1);
});