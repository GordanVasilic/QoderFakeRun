const jwt = require('jsonwebtoken');

// Test file generation endpoint
async function testFileGeneration() {
  console.log('🧪 Testing file generation endpoint...');
  
  // Create admin token
  const adminUser = {
    id: 'cmeu1kwjg0000w5zgh3xdrxma',
    email: 'admin@qoderfakerun.com',
    role: 'ADMIN',
    tokenBalance: 1000
  };
  
  const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
  const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '7d' });
  
  console.log('🎫 Generated admin token');
  
  // Test data for file generation (matching FileGenerationSchema)
  const testData = {
    routeData: {
      points: [
        { lat: 44.8176, lng: 20.4633, elevation: 100 },
        { lat: 44.8186, lng: 20.4643, elevation: 105 },
        { lat: 44.8196, lng: 20.4653, elevation: 110 }
      ],
      distance: 1000,
      duration: 600,
      elevationGain: 10,
      averagePace: 6
    },
    options: {
      name: 'Test GPX Route',
      date: '2025-09-04',
      startTime: '10:00',
      description: 'Testing GPX file generation',
      includeHeartRate: false,
      activityType: 'run'
    },
    format: 'gpx'
  };
  
  console.log('📍 Test data:', {
    name: testData.options.name,
    coordinatesCount: testData.routeData.points.length,
    format: testData.format,
    activityType: testData.options.activityType
  });
  
  try {
    const response = await fetch('http://localhost:3000/api/files/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📄 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ SUCCESS! GPX file generated:');
      console.log('📄 First 500 characters of GPX:');
      console.log(responseText.substring(0, 500) + '...');
      
      // Check if it contains expected GPX elements
      const hasGpxRoot = responseText.includes('<gpx');
      const hasTrack = responseText.includes('<trk>');
      const hasTrackPoints = responseText.includes('<trkpt');
      const hasStravaCreator = responseText.includes('StravaGPX');
      const hasLowercaseActivity = responseText.includes('running') || responseText.includes('cycling');
      
      console.log('🔍 GPX Format Validation:');
      console.log('  - Has GPX root element:', hasGpxRoot ? '✅' : '❌');
      console.log('  - Has track element:', hasTrack ? '✅' : '❌');
      console.log('  - Has track points:', hasTrackPoints ? '✅' : '❌');
      console.log('  - Has Strava-compatible creator:', hasStravaCreator ? '✅' : '❌');
      console.log('  - Has lowercase activity type:', hasLowercaseActivity ? '✅' : '❌');
      
      if (hasGpxRoot && hasTrack && hasTrackPoints && hasStravaCreator) {
        console.log('🎉 GPX file format is correct and Strava-compatible!');
      } else {
        console.log('⚠️  GPX file format may have issues');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ ERROR! File generation failed:');
      console.log('Response:', errorText);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the test
testFileGeneration().catch(console.error);