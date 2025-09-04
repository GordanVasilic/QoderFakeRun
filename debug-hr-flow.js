// Debug script to test heart rate data flow from frontend to GPX generation
const fs = require('fs');

// Test data that mimics what the frontend should send
const testRequest = {
  routeData: {
    points: [
      { lat: 46.05, lng: 14.5, elevation: 300 },
      { lat: 46.06, lng: 14.51, elevation: 310 },
      { lat: 46.07, lng: 14.52, elevation: 320 },
      { lat: 46.08, lng: 14.53, elevation: 315 },
      { lat: 46.09, lng: 14.54, elevation: 325 }
    ],
    distance: 2.1,
    duration: 630,
    elevationGain: 25,
    averagePace: 5.0,
    activityType: 'run',
    routeCoordinates: [
      [14.5, 46.05],
      [14.51, 46.06],
      [14.52, 46.07],
      [14.53, 46.08],
      [14.54, 46.09]
    ],
    routeElevations: [300, 310, 320, 315, 325]
  },
  options: {
    name: 'Debug HR Test Run',
    date: '2024-01-04',
    startTime: '09:00',
    description: 'Testing heart rate data export',
    includeHeartRate: true,  // CRITICAL: This should be true
    activityType: 'run'
  },
  chartData: [
    { distance: 0.0, pace: 4.8, elevation: 300, heartRate: 145 },
    { distance: 0.5, pace: 5.0, elevation: 310, heartRate: 152 },
    { distance: 1.0, pace: 5.2, elevation: 320, heartRate: 158 },
    { distance: 1.5, pace: 4.9, elevation: 315, heartRate: 155 },
    { distance: 2.1, pace: 5.1, elevation: 325, heartRate: 160 }
  ],
  format: 'gpx'
};

console.log('🔍 DEBUG HR FLOW TEST');
console.log('='.repeat(50));

// Step 1: Verify test data structure
console.log('\n📋 Step 1: Verify test data structure');
console.log('- Route points:', testRequest.routeData.points.length);
console.log('- Route coordinates:', testRequest.routeData.routeCoordinates?.length || 0);
console.log('- Chart data points:', testRequest.chartData.length);
console.log('- Include HR flag:', testRequest.options.includeHeartRate);
console.log('- HR values:', testRequest.chartData.map(p => p.heartRate));

// Step 2: Check heart rate data validity
console.log('\n💓 Step 2: Heart rate data analysis');
const hrPoints = testRequest.chartData.filter(p => p.heartRate && p.heartRate > 50 && p.heartRate < 250);
console.log('- Valid HR points:', hrPoints.length, '/', testRequest.chartData.length);
console.log('- HR range:', Math.min(...hrPoints.map(p => p.heartRate)), '-', Math.max(...hrPoints.map(p => p.heartRate)));

// Step 3: Test API call
console.log('\n🌐 Step 3: Testing API call');
fetch('http://localhost:3000/api/files/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testRequest)
})
.then(response => {
  console.log('- Response status:', response.status);
  return response.json();
})
.then(data => {
  if (data.success) {
    console.log('✅ API call successful!');
    console.log('- Generated files:', data.data.files.length);
    
    // Step 4: Analyze generated GPX content
    const gpxFile = data.data.files.find(f => f.name.endsWith('.gpx'));
    if (gpxFile) {
      console.log('\n📁 Step 4: Analyzing GPX content');
      const gpxContent = gpxFile.content;
      
      // Save for inspection
      fs.writeFileSync('debug-hr-output.gpx', gpxContent);
      console.log('- GPX file saved as: debug-hr-output.gpx');
      
      // Check for heart rate extensions
      const hasHRExtensions = gpxContent.includes('<gpxtpx:hr>');
      const hasTrackPointExtensions = gpxContent.includes('<gpxtpx:TrackPointExtension>');
      const hasExtensionsTag = gpxContent.includes('<extensions>');
      const hasGarminNamespace = gpxContent.includes('xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"');
      
      console.log('\n🔍 GPX Heart Rate Analysis:');
      console.log('- Has <extensions> tags:', hasExtensionsTag);
      console.log('- Has TrackPointExtension:', hasTrackPointExtensions);
      console.log('- Has <gpxtpx:hr> tags:', hasHRExtensions);
      console.log('- Has Garmin namespace:', hasGarminNamespace);
      
      // Count heart rate values
      const hrMatches = gpxContent.match(/<gpxtpx:hr>\d+<\/gpxtpx:hr>/g);
      console.log('- HR values found:', hrMatches ? hrMatches.length : 0);
      
      if (hrMatches) {
        const hrValues = hrMatches.map(match => match.match(/\d+/)[0]);
        console.log('- HR values:', hrValues.slice(0, 5).join(', '), hrValues.length > 5 ? '...' : '');
      }
      
      // Check track points
      const trkptMatches = gpxContent.match(/<trkpt[^>]*>/g);
      console.log('- Track points found:', trkptMatches ? trkptMatches.length : 0);
      
      // Final verdict
      if (hasHRExtensions && hrMatches && hrMatches.length > 0) {
        console.log('\n🎉 SUCCESS: Heart rate data is properly included in GPX!');
      } else {
        console.log('\n❌ PROBLEM: Heart rate data is missing from GPX!');
        
        // Show a sample of the GPX content for debugging
        console.log('\n📄 Sample GPX content (first 1000 chars):');
        console.log(gpxContent.substring(0, 1000) + '...');
      }
    } else {
      console.log('❌ No GPX file found in response');
    }
  } else {
    console.log('❌ API call failed:', data.error);
  }
})
.catch(error => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Make sure the development server is running on http://localhost:3000');
});