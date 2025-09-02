const jwt = require('jsonwebtoken');

// Test frontend route saving functionality with correct data structure
async function testFrontendRouteSaveFixed() {
  console.log('🧪 Testing Frontend Route Save Functionality (Fixed)...');
  
  try {
    // Generate admin token (same as frontend would use)
    // Use the actual secret that the server is using
    const JWT_SECRET = 'your-secret-key-here';
    const adminToken = jwt.sign(
      { 
        id: 'cmeu1kwjg0000w5zgh3xdrxma', // Real admin user ID from database
        email: 'admin@qoderfakerun.com',
        role: 'ADMIN',
        tokenBalance: 9999
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Generated admin token');
    
    // Create payload that matches frontend structure exactly
    const payload = {
      name: "Frontend Test Route Fixed",
      description: "Testing the fixed route creation with correct data structure",
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
    
    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));
    
    // Make request to API (same as frontend)
    const response = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('✅ Route created successfully!');
      console.log('📍 Route ID:', result.data.id);
      console.log('📍 Route Name:', result.data.name);
      return true;
    } else {
      console.log('❌ Route creation failed');
      console.log('Error:', result.error || 'Unknown error');
      if (result.details) {
        console.log('Details:', JSON.stringify(result.details, null, 2));
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testFrontendRouteSaveFixed().then(success => {
  console.log(success ? '🎉 Test completed successfully!' : '💥 Test failed!');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});