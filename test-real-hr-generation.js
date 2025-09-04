// Test script to verify heart rate data generation in the actual application
const fs = require('fs');

// Test data that mimics what the frontend would send
const testRequest = {
  routeData: {
    points: [
      { lat: 46.05, lng: 14.5, elevation: 300 },
      { lat: 46.055, lng: 14.505, elevation: 305 },
      { lat: 46.06, lng: 14.51, elevation: 310 },
      { lat: 46.065, lng: 14.515, elevation: 315 },
      { lat: 46.07, lng: 14.52, elevation: 320 }
    ],
    distance: 2.1,
    duration: 630,
    elevationGain: 20,
    averagePace: 5.0
  },
  options: {
    name: 'Real HR Test Route',
    date: '2024-01-04',
    startTime: '08:00',
    description: 'Testing heart rate data inclusion',
    includeHeartRate: true,
    activityType: 'run'
  },
  chartData: [
    { distance: 0, pace: 5.0, elevation: 300, heartRate: 120 },
    { distance: 0.5, pace: 4.8, elevation: 305, heartRate: 135 },
    { distance: 1.0, pace: 4.5, elevation: 310, heartRate: 150 },
    { distance: 1.5, pace: 4.7, elevation: 315, heartRate: 145 },
    { distance: 2.0, pace: 5.2, elevation: 320, heartRate: 140 }
  ],
  format: 'gpx'
};

console.log('🧪 Testing real HR generation with API call...');
console.log('📊 Request data:');
console.log('- Route points:', testRequest.routeData.points.length);
console.log('- Chart data points:', testRequest.chartData.length);
console.log('- Include HR:', testRequest.options.includeHeartRate);
console.log('- HR values:', testRequest.chartData.map(p => p.heartRate));

// Make actual API call to test the real generation
fetch('http://localhost:3000/api/files/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testRequest)
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('✅ API call successful!');
    console.log('📁 Generated files:', data.data.files.length);
    
    // Save the generated GPX file
    const gpxFile = data.data.files.find(f => f.name.endsWith('.gpx'));
    if (gpxFile) {
      fs.writeFileSync('real-hr-test-output.gpx', gpxFile.content);
      console.log('💾 Saved GPX file as: real-hr-test-output.gpx');
      
      // Check for heart rate extensions
      const hasHRExtensions = gpxFile.content.includes('<gpxtpx:hr>');
      const hrMatches = gpxFile.content.match(/<gpxtpx:hr>(\d+)<\/gpxtpx:hr>/g);
      
      console.log('💓 Heart rate analysis:');
      console.log('- Contains HR extensions:', hasHRExtensions);
      console.log('- HR entries found:', hrMatches ? hrMatches.length : 0);
      if (hrMatches) {
        console.log('- HR values:', hrMatches.map(m => m.match(/\d+/)[0]));
      }
      
      // Check namespace
      const hasCorrectNamespace = gpxFile.content.includes('xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"');
      console.log('- Correct gpxtpx namespace:', hasCorrectNamespace);
      
      if (hasHRExtensions && hasCorrectNamespace && hrMatches && hrMatches.length > 0) {
        console.log('🎉 SUCCESS: Heart rate data is properly included in Strava-compatible format!');
      } else {
        console.log('❌ ISSUE: Heart rate data may not be properly formatted for Strava');
      }
    }
  } else {
    console.error('❌ API call failed:', data.error);
  }
})
.catch(error => {
  console.error('❌ Network error:', error.message);
  console.log('💡 Make sure the development server is running (npm run dev)');
});