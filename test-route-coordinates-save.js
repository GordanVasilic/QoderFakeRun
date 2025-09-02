// Test script to verify route coordinates and elevations are saved properly
// This will create a test route and save it to see the detailed logging

const testRouteData = {
  points: [
    { lat: 40.7128, lng: -74.0060, elevation: 10 },
    { lat: 40.7138, lng: -74.0050, elevation: 15 },
    { lat: 40.7148, lng: -74.0040, elevation: 20 },
    { lat: 40.7158, lng: -74.0030, elevation: 25 },
    { lat: 40.7168, lng: -74.0020, elevation: 30 }
  ],
  distance: 1.2,
  duration: 360,
  elevationGain: 20,
  averagePace: 5.0,
  routeGeometry: {
    type: 'LineString',
    coordinates: [
      [-74.0060, 40.7128],
      [-74.0050, 40.7138],
      [-74.0040, 40.7148],
      [-74.0030, 40.7158],
      [-74.0020, 40.7168]
    ]
  },
  routeCoordinates: [
    [-74.0060, 40.7128],
    [-74.0055, 40.7133],
    [-74.0050, 40.7138],
    [-74.0045, 40.7143],
    [-74.0040, 40.7148],
    [-74.0035, 40.7153],
    [-74.0030, 40.7158],
    [-74.0025, 40.7163],
    [-74.0020, 40.7168]
  ],
  routeElevations: [10, 12, 15, 17, 20, 22, 25, 27, 30]
};

const testChartData = [
  { distance: 0, elevation: 10, pace: 5.0, heartRate: 140 },
  { distance: 0.15, elevation: 12, pace: 5.1, heartRate: 142 },
  { distance: 0.3, elevation: 15, pace: 4.9, heartRate: 145 },
  { distance: 0.45, elevation: 17, pace: 5.2, heartRate: 148 },
  { distance: 0.6, elevation: 20, pace: 5.0, heartRate: 150 },
  { distance: 0.75, elevation: 22, pace: 4.8, heartRate: 152 },
  { distance: 0.9, elevation: 25, pace: 5.1, heartRate: 149 },
  { distance: 1.05, elevation: 27, pace: 5.0, heartRate: 147 },
  { distance: 1.2, elevation: 30, pace: 4.9, heartRate: 145 }
];

const testPayload = {
  name: 'Test Route - Coordinates Check',
  description: 'Testing if all route coordinates and elevations are saved properly',
  routeData: testRouteData,
  chartData: testChartData,
  activityType: 'run',
  date: '2025-01-01',
  startTime: '08:00',
  paceHeartRateSettings: {
    averagePace: 5.0,
    paceInconsistency: 25,
    includeHeartRate: true,
    averageHeartRate: 146,
    heartRateVariability: 15
  }
};

console.log('🧪 Test Route Data Summary:');
console.log('📍 Waypoints (points):', testRouteData.points.length);
console.log('🗺️ Route coordinates:', testRouteData.routeCoordinates.length);
console.log('🏔️ Route elevations:', testRouteData.routeElevations.length);
console.log('📊 Chart data points:', testChartData.length);
console.log('');
console.log('📝 Payload keys:', Object.keys(testPayload));
console.log('🗺️ RouteData keys:', Object.keys(testPayload.routeData));
console.log('');

// Function to send test route to API
async function testRouteSave() {
  try {
    console.log('🚀 Sending test route to API...');
    
    const response = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You may need to get a real token
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Route saved successfully!');
      console.log('📄 Response:', result);
    } else {
      const error = await response.text();
      console.error('❌ Failed to save route:', error);
    }
  } catch (error) {
    console.error('🚨 Network error:', error);
  }
}

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testRouteSave();
} else {
  // Browser environment
  console.log('🌐 Running in browser - call testRouteSave() to execute test');
  window.testRouteSave = testRouteSave;
}

module.exports = { testRouteData, testChartData, testPayload, testRouteSave };