const jwt = require('jsonwebtoken');

// Test frontend route saving functionality
async function testFrontendRouteSave() {
  console.log('🧪 Testing Frontend Route Save Functionality...');
  
  try {
    // Generate admin token (same as frontend would use)
    const adminToken = jwt.sign(
      { 
        id: 'admin-temp-id', 
        email: 'admin@qoderfakerun.com',
        role: 'ADMIN'
      }, 
      process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
      { expiresIn: '1h' }
    );
    
    console.log('✅ Admin token generated');
    
    // Create test route data (exactly like frontend sends)
    const payload = {
      name: 'Frontend Test Route',
      description: 'Test route from frontend simulation',
      routeData: {
        points: [
          { lat: 40.7128, lng: -74.0060, elevation: 10 },
          { lat: 40.7138, lng: -74.0070, elevation: 15 },
          { lat: 40.7148, lng: -74.0080, elevation: 20 }
        ],
        distance: 1.5,
        duration: 600,
        elevationGain: 10
      },
      isPublic: false,
      chartData: [
        { distance: 0, pace: 5.5, elevation: 10, heartRate: 120 },
        { distance: 0.5, pace: 5.3, elevation: 15, heartRate: 125 },
        { distance: 1.0, pace: 5.7, elevation: 20, heartRate: 130 }
      ],
      activityType: 'run',
      date: new Date().toISOString().split('T')[0],
      startTime: '12:00'
    };
    
    console.log('📤 Sending route creation request (simulating frontend)...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    // Make request to API (same as frontend)
    const response = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('📊 Response body:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('❌ Frontend route save failed!');
      console.error('Error:', result.error);
      console.error('Code:', result.code);
      console.error('Details:', result.details);
      return false;
    }
    
    console.log('✅ Frontend route save successful!');
    console.log('📊 Route Details:');
    console.log('   - ID:', result.data.id);
    console.log('   - Name:', result.data.name);
    console.log('   - Distance:', result.data.stats?.distance + 'km');
    console.log('   - Points:', result.data.stats?.pointCount);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
testFrontendRouteSave().then(success => {
  if (success) {
    console.log('🎉 Frontend route save test passed!');
    process.exit(0);
  } else {
    console.log('💥 Frontend route save test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});