const jwt = require('jsonwebtoken');

// Test complete frontend-to-backend flow
async function testCompleteFlow() {
  console.log('🧪 Testing Complete Frontend-to-Backend Flow...');
  
  try {
    // Step 1: Login as admin to get a valid token
    console.log('\n📝 Step 1: Admin Login');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@qoderfakerun.com',
        password: 'gogo'
      })
    });
    
    const loginResult = await loginResponse.json();
    console.log('Login response:', loginResult.success ? '✅ Success' : '❌ Failed');
    
    if (!loginResult.success) {
      console.error('Login failed:', loginResult.error);
      return false;
    }
    
    const { token, user } = loginResult.data;
    console.log('✅ Logged in as:', user.email, '(ID:', user.id, ')');
    
    // Step 2: Create a route using the obtained token
    console.log('\n📝 Step 2: Create Route with Valid Token');
    const routePayload = {
      name: "Complete Flow Test Route",
      description: "Testing the complete frontend-to-backend flow",
      routeData: {
        points: [
          { lat: 40.7128, lng: -74.0060, elevation: 10 }, // New York
          { lat: 40.7589, lng: -73.9851, elevation: 15 }, // Times Square
          { lat: 40.7505, lng: -73.9934, elevation: 20 }  // Broadway
        ],
        distance: 5.0, // 5km
        duration: 1800, // 30 minutes
        elevationGain: 100,
        averagePace: 6.0,
        routeCoordinates: [
          [-74.0060, 40.7128], // [lng, lat] format
          [-73.9851, 40.7589],
          [-73.9934, 40.7505]
        ],
        routeElevations: [10, 15, 20]
      },
      isPublic: false,
      chartData: [
        { distance: 0, pace: 6.0, elevation: 10 },
        { distance: 2.5, pace: 5.8, elevation: 15 },
        { distance: 5.0, pace: 6.2, elevation: 20 }
      ],
      activityType: "run",
      date: "2024-01-15",
      startTime: "08:00"
    };
    
    const routeResponse = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(routePayload)
    });
    
    const routeResult = await routeResponse.json();
    console.log('Route creation response:', routeResult.success ? '✅ Success' : '❌ Failed');
    
    if (!routeResult.success) {
      console.error('Route creation failed:', routeResult.error);
      if (routeResult.details) {
        console.error('Details:', JSON.stringify(routeResult.details, null, 2));
      }
      return false;
    }
    
    const createdRoute = routeResult.data;
    console.log('✅ Route created successfully!');
    console.log('📍 Route ID:', createdRoute.id);
    console.log('📍 Route Name:', createdRoute.name);
    
    // Step 3: Verify the route was saved by fetching it
    console.log('\n📝 Step 3: Verify Route was Saved');
    const fetchResponse = await fetch(`http://localhost:3000/api/routes/${createdRoute.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const fetchResult = await fetchResponse.json();
    console.log('Route fetch response:', fetchResult.success ? '✅ Success' : '❌ Failed');
    
    if (!fetchResult.success) {
      console.error('Route fetch failed:', fetchResult.error);
      return false;
    }
    
    const fetchedRoute = fetchResult.data;
    console.log('✅ Route fetched successfully!');
    console.log('📍 Fetched Route Name:', fetchedRoute.name);
    console.log('📍 Fetched Route Distance:', fetchedRoute.distance, 'km');
    
    // Step 4: List all routes to confirm it appears in the list
    console.log('\n📝 Step 4: List All Routes');
    const listResponse = await fetch('http://localhost:3000/api/routes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const listResult = await listResponse.json();
    console.log('Route list response:', listResult.success ? '✅ Success' : '❌ Failed');
    
    if (!listResult.success) {
      console.error('Route list failed:', listResult.error);
      return false;
    }
    
    const routes = listResult.data.routes;
    const foundRoute = routes.find(r => r.id === createdRoute.id);
    
    if (foundRoute) {
      console.log('✅ Route found in list!');
      console.log('📍 Listed Route Name:', foundRoute.name);
    } else {
      console.log('❌ Route not found in list');
      return false;
    }
    
    console.log('\n🎉 Complete Flow Test PASSED!');
    console.log('✅ All steps completed successfully:');
    console.log('  1. Admin login ✅');
    console.log('  2. Route creation ✅');
    console.log('  3. Route retrieval ✅');
    console.log('  4. Route listing ✅');
    
    return true;
    
  } catch (error) {
    console.error('❌ Complete flow test failed with error:', error.message);
    return false;
  }
}

// Run the test
testCompleteFlow().then(success => {
  console.log(success ? '\n🎉 COMPLETE FLOW TEST PASSED!' : '\n💥 COMPLETE FLOW TEST FAILED!');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});