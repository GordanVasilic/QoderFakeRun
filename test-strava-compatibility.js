// Comprehensive test to verify Strava compatibility of generated GPX files
const fs = require('fs');

// Test different scenarios that might affect Strava import
const testScenarios = [
  {
    name: 'Basic HR Test',
    description: 'Simple route with consistent heart rate data',
    routeData: {
      points: [
        { lat: 46.05, lng: 14.5, elevation: 300 },
        { lat: 46.055, lng: 14.505, elevation: 305 },
        { lat: 46.06, lng: 14.51, elevation: 310 }
      ],
      distance: 1.0,
      duration: 300,
      elevationGain: 10,
      averagePace: 5.0
    },
    chartData: [
      { distance: 0, pace: 5.0, elevation: 300, heartRate: 140 },
      { distance: 0.5, pace: 5.0, elevation: 305, heartRate: 145 },
      { distance: 1.0, pace: 5.0, elevation: 310, heartRate: 150 }
    ]
  },
  {
    name: 'Variable HR Test',
    description: 'Route with varying heart rate (realistic scenario)',
    routeData: {
      points: [
        { lat: 46.05, lng: 14.5, elevation: 300 },
        { lat: 46.055, lng: 14.505, elevation: 320 },
        { lat: 46.06, lng: 14.51, elevation: 340 },
        { lat: 46.065, lng: 14.515, elevation: 330 },
        { lat: 46.07, lng: 14.52, elevation: 310 }
      ],
      distance: 2.5,
      duration: 750,
      elevationGain: 40,
      averagePace: 5.0
    },
    chartData: [
      { distance: 0, pace: 5.5, elevation: 300, heartRate: 120 },
      { distance: 0.6, pace: 4.5, elevation: 320, heartRate: 160 },
      { distance: 1.2, pace: 4.2, elevation: 340, heartRate: 175 },
      { distance: 1.8, pace: 4.8, elevation: 330, heartRate: 155 },
      { distance: 2.4, pace: 5.2, elevation: 310, heartRate: 135 }
    ]
  },
  {
    name: 'Edge Case HR Test',
    description: 'Route with edge case heart rate values',
    routeData: {
      points: [
        { lat: 46.05, lng: 14.5, elevation: 300 },
        { lat: 46.055, lng: 14.505, elevation: 305 }
      ],
      distance: 0.5,
      duration: 150,
      elevationGain: 5,
      averagePace: 5.0
    },
    chartData: [
      { distance: 0, pace: 5.0, elevation: 300, heartRate: 50 },  // Min valid HR
      { distance: 0.5, pace: 5.0, elevation: 305, heartRate: 250 } // Max valid HR
    ]
  }
];

async function testScenario(scenario, index) {
  console.log(`\n🧪 Testing Scenario ${index + 1}: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  
  const testRequest = {
    routeData: scenario.routeData,
    options: {
      name: scenario.name,
      date: '2024-01-04',
      startTime: '08:00',
      description: scenario.description,
      includeHeartRate: true,
      activityType: 'run'
    },
    chartData: scenario.chartData,
    format: 'gpx'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/files/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    });
    
    const data = await response.json();
    
    if (data.success) {
      const gpxFile = data.data.files.find(f => f.name.endsWith('.gpx'));
      if (gpxFile) {
        const filename = `strava-test-${index + 1}-${scenario.name.toLowerCase().replace(/\s+/g, '-')}.gpx`;
        fs.writeFileSync(filename, gpxFile.content);
        
        // Analyze the GPX content for Strava compatibility
        const analysis = analyzeGPXForStrava(gpxFile.content, scenario.chartData);
        
        console.log(`✅ Generated: ${filename}`);
        console.log(`💓 HR Analysis:`);
        console.log(`   - HR extensions found: ${analysis.hrExtensionsFound}`);
        console.log(`   - Expected HR points: ${scenario.chartData.length}`);
        console.log(`   - Actual HR points: ${analysis.hrPointsCount}`);
        console.log(`   - HR values match: ${analysis.hrValuesMatch}`);
        console.log(`   - Correct namespace: ${analysis.correctNamespace}`);
        console.log(`   - Valid XML structure: ${analysis.validXML}`);
        
        if (analysis.issues.length > 0) {
          console.log(`⚠️  Issues found:`);
          analysis.issues.forEach(issue => console.log(`   - ${issue}`));
        } else {
          console.log(`🎉 Perfect Strava compatibility!`);
        }
        
        return analysis;
      }
    } else {
      console.error(`❌ API call failed:`, data.error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Network error:`, error.message);
    return null;
  }
}

function analyzeGPXForStrava(gpxContent, expectedChartData) {
  const analysis = {
    hrExtensionsFound: false,
    hrPointsCount: 0,
    hrValuesMatch: false,
    correctNamespace: false,
    validXML: false,
    issues: []
  };
  
  // Check for heart rate extensions
  analysis.hrExtensionsFound = gpxContent.includes('<gpxtpx:hr>');
  
  // Count heart rate points
  const hrMatches = gpxContent.match(/<gpxtpx:hr>(\d+)<\/gpxtpx:hr>/g);
  analysis.hrPointsCount = hrMatches ? hrMatches.length : 0;
  
  // Check if HR values match expected
  if (hrMatches && expectedChartData) {
    const extractedHRValues = hrMatches.map(m => parseInt(m.match(/\d+/)[0]));
    const expectedHRValues = expectedChartData.map(d => d.heartRate);
    analysis.hrValuesMatch = JSON.stringify(extractedHRValues) === JSON.stringify(expectedHRValues);
    
    if (!analysis.hrValuesMatch) {
      analysis.issues.push(`HR values mismatch. Expected: [${expectedHRValues.join(', ')}], Got: [${extractedHRValues.join(', ')}]`);
    }
  }
  
  // Check for correct namespace
  analysis.correctNamespace = gpxContent.includes('xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"');
  if (!analysis.correctNamespace) {
    analysis.issues.push('Missing or incorrect gpxtpx namespace');
  }
  
  // Basic XML structure validation
  analysis.validXML = gpxContent.includes('<?xml version="1.0"') && 
                     gpxContent.includes('<gpx') && 
                     gpxContent.includes('</gpx>');
  if (!analysis.validXML) {
    analysis.issues.push('Invalid XML structure');
  }
  
  // Check for required Strava elements
  if (!gpxContent.includes('<trk>')) {
    analysis.issues.push('Missing track element');
  }
  
  if (!gpxContent.includes('<trkpt')) {
    analysis.issues.push('Missing track points');
  }
  
  if (!gpxContent.includes('<time>')) {
    analysis.issues.push('Missing time elements (required by Strava)');
  }
  
  return analysis;
}

async function runAllTests() {
  console.log('🚀 Starting Strava Compatibility Tests...');
  console.log('📋 Testing multiple scenarios to ensure GPX files work with Strava\n');
  
  const results = [];
  
  for (let i = 0; i < testScenarios.length; i++) {
    const result = await testScenario(testScenarios[i], i);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  const successfulTests = results.filter(r => r && r.issues.length === 0).length;
  console.log(`✅ Successful tests: ${successfulTests}/${testScenarios.length}`);
  
  if (successfulTests === testScenarios.length) {
    console.log('🎉 All tests passed! GPX files should work perfectly with Strava.');
  } else {
    console.log('⚠️  Some tests had issues. Check the details above.');
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Upload one of the generated GPX files to Strava manually');
  console.log('2. Check if heart rate data appears in the Strava activity');
  console.log('3. If issues persist, the problem might be with Strava\'s processing');
}

// Run the tests
runAllTests().catch(console.error);