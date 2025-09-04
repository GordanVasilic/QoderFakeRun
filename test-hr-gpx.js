// Since we can't directly require TypeScript, let's create a simple test
// that mimics the GPX generation logic for heart rate
const fs = require('fs');

// Simplified GPX generation function to test heart rate extensions
function generateTestGPX(routeData, options, chartData) {
  const { name, date, startTime, description } = options;
  
  console.log('📁 GPX Generation - Title:', name, 'Description:', description);
  console.log('💓 GPX Generation - Include HR:', options.includeHeartRate, 'Chart data points:', chartData?.length || 0);
  
  if (options.includeHeartRate) {
    console.log('💓 HEART RATE ENABLED - Expected to include HR data in GPX');
    if (chartData && chartData.length > 0) {
      const hrSamples = chartData.slice(0, 5).map(p => ({ dist: p.distance, hr: p.heartRate }));
      console.log('💓 Sample chart data with HR:', hrSamples);
    } else {
      console.log('⚠️  PROBLEM: Heart rate enabled but no chart data for GPX!');
    }
  }
  
  const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
  
  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <time>${startDateTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${name || 'My Route'}</name>
    <type>${options.activityType === 'bike' ? 'cycling' : 'running'}</type>
    <trkseg>`;

  // Use route coordinates if available
  const useFullRoute = routeData.routeCoordinates && routeData.routeCoordinates.length > 0;
  
  if (useFullRoute) {
    console.log('📁 GPX: Using full route with', routeData.routeCoordinates.length, 'GPS points');
    
    let cumulativeTime = 0;
    
    routeData.routeCoordinates.forEach((coord, index) => {
      const [lng, lat] = coord;
      const elevation = routeData.routeElevations[index] || 0;
      
      if (index > 0) {
        cumulativeTime += 30; // Simple 30 second intervals
      }
      
      const pointTime = new Date(startDateTime.getTime() + (cumulativeTime * 1000));
      
      gpxContent += `
      <trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}">
        <ele>${elevation.toFixed(2)}</ele>
        <time>${pointTime.toISOString()}</time>`;
      
      // Add heart rate data if available and enabled
      if (options.includeHeartRate && chartData && chartData.length > 0) {
        const chartIndex = Math.min(Math.floor((index / routeData.routeCoordinates.length) * chartData.length), chartData.length - 1);
        const heartRate = chartData[chartIndex]?.heartRate;
        
        if (heartRate && heartRate > 50 && heartRate < 250) {
          gpxContent += `
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${Math.round(heartRate)}</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>`;
        }
      }
      
      gpxContent += `
      </trkpt>`;
    });
  }

  gpxContent += `
    </trkseg>
  </trk>
</gpx>`;

  return gpxContent;
}

// Mock route data
const mockRouteData = {
  points: [
    { lat: 46.05, lng: 14.5, elevation: 300 },
    { lat: 46.06, lng: 14.51, elevation: 310 },
    { lat: 46.07, lng: 14.52, elevation: 320 }
  ],
  distance: 2.1,
  duration: 630, // 10:30
  elevationGain: 20,
  averagePace: 5.0,
  routeCoordinates: [
    [14.5, 46.05],
    [14.505, 46.055],
    [14.51, 46.06],
    [14.515, 46.065],
    [14.52, 46.07]
  ],
  routeElevations: [300, 305, 310, 315, 320]
};

// Mock chart data with heart rate
const mockChartData = [
  { distance: 0, pace: 5.0, elevation: 300, heartRate: 120 },
  { distance: 0.5, pace: 5.2, elevation: 305, heartRate: 135 },
  { distance: 1.0, pace: 4.8, elevation: 310, heartRate: 150 },
  { distance: 1.5, pace: 5.1, elevation: 315, heartRate: 145 },
  { distance: 2.1, pace: 5.0, elevation: 320, heartRate: 140 }
];

// Options with heart rate enabled
const options = {
  name: 'Test HR Route',
  date: '2024-01-04',
  startTime: '08:00',
  description: 'Test route with heart rate data',
  includeHeartRate: true,
  activityType: 'run'
};

console.log('🧪 Testing GPX generation with heart rate data...');
console.log('📊 Chart data points:', mockChartData.length);
console.log('💓 Heart rate values:', mockChartData.map(p => p.heartRate));
console.log('🏃 Include HR flag:', options.includeHeartRate);

try {
  // Generate GPX content
  const gpxContent = generateTestGPX(mockRouteData, options, mockChartData);
  
  // Save to file for inspection
  fs.writeFileSync('test-output-hr.gpx', gpxContent);
  
  console.log('✅ GPX file generated successfully!');
  console.log('📁 Saved as: test-output-hr.gpx');
  
  // Check if heart rate extensions are present
  const hasHRExtensions = gpxContent.includes('<gpxtpx:hr>');
  const hasTrackPointExtensions = gpxContent.includes('<gpxtpx:TrackPointExtension>');
  const hasExtensionsTag = gpxContent.includes('<extensions>');
  
  console.log('\n🔍 Heart Rate Analysis:');
  console.log('- Contains <extensions> tags:', hasExtensionsTag);
  console.log('- Contains <gpxtpx:TrackPointExtension>:', hasTrackPointExtensions);
  console.log('- Contains <gpxtpx:hr> tags:', hasHRExtensions);
  
  if (hasHRExtensions) {
    // Count heart rate entries
    const hrMatches = gpxContent.match(/<gpxtpx:hr>\d+<\/gpxtpx:hr>/g);
    console.log('- Number of HR entries found:', hrMatches ? hrMatches.length : 0);
    if (hrMatches) {
      console.log('- Sample HR values:', hrMatches.slice(0, 3));
    }
  } else {
    console.log('❌ NO HEART RATE DATA FOUND IN GPX!');
  }
  
  // Check namespace declarations
  const hasGpxtpxNamespace = gpxContent.includes('xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"');
  console.log('- Has gpxtpx namespace:', hasGpxtpxNamespace);
  
  console.log('\n📄 First 1000 characters of GPX:');
  console.log(gpxContent.substring(0, 1000));
  
} catch (error) {
  console.error('❌ Error generating GPX:', error);
}