const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

// Test saving a route with paceHeartRateSettings
async function testPaceSave() {
  try {
    console.log('🧪 Testing route save with paceHeartRateSettings...')
    
    const testRoute = {
      name: 'Test Route with Pace Settings',
      description: 'Testing pace settings persistence',
      routeData: {
        points: [
          { lat: 45.815, lng: 15.982, elevation: 100 },
          { lat: 45.816, lng: 15.983, elevation: 105 },
          { lat: 45.817, lng: 15.984, elevation: 110 }
        ],
        distance: 5.2,
        duration: 1800, // 30 minutes
        elevationGain: 50,
        averagePace: 5.77, // This is the calculated pace from distance/duration
        paceHeartRateSettings: {
          averagePace: 5.0, // User set this to 5 min/km
          paceInconsistency: 30,
          includeHeartRate: true,
          averageHeartRate: 150,
          heartRateVariability: 20
        }
      },
      chartData: [
        { distance: 0, pace: 5.0, elevation: 100, heartRate: 145 },
        { distance: 1, pace: 4.8, elevation: 102, heartRate: 148 },
        { distance: 2, pace: 5.2, elevation: 105, heartRate: 152 }
      ],
      activityType: 'run',
      date: '2025-01-28',
      startTime: '08:00',
      paceHeartRateSettings: {
        averagePace: 5.0, // User set this to 5 min/km
        paceInconsistency: 30,
        includeHeartRate: true,
        averageHeartRate: 150,
        heartRateVariability: 20
      }
    }
    
    console.log('📤 Sending route with paceHeartRateSettings:', {
      routeDataPace: testRoute.routeData.averagePace,
      routeDataSettings: testRoute.routeData.paceHeartRateSettings,
      topLevelSettings: testRoute.paceHeartRateSettings
    })
    
    const response = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZXUxa3dqZzAwMDB3NXpnaDN4ZHJ4bWEiLCJlbWFpbCI6ImFkbWluQHFvZGVyZmFrZXJ1bi5jb20iLCJ1c2VybmFtZSI6ImdvZ28iLCJyb2xlIjoiQURNSU4iLCJ0b2tlbkJhbGFuY2UiOjk5OTksImlhdCI6MTc1NjMxODA0MiwiZXhwIjoxNzU2OTIyODQyfQ.61PheWcG8S-WbUlftIS6RUsMz3f9E49GNINZhrJYZCw'
      },
      body: JSON.stringify(testRoute)
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Route saved successfully!')
      console.log('📊 Saved route ID:', result.data.id)
      
      // Now fetch it back to verify the paceHeartRateSettings were saved
      console.log('\n🔍 Fetching route back to verify...')
      
      const fetchResponse = await fetch(`http://localhost:3000/api/routes/${result.data.id}`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZXUxa3dqZzAwMDB3NXpnaDN4ZHJ4bWEiLCJlbWFpbCI6ImFkbWluQHFvZGVyZmFrZXJ1bi5jb20iLCJ1c2VybmFtZSI6ImdvZ28iLCJyb2xlIjoiQURNSU4iLCJ0b2tlbkJhbGFuY2UiOjk5OTksImlhdCI6MTc1NjMxODA0MiwiZXhwIjoxNzU2OTIyODQyfQ.61PheWcG8S-WbUlftIS6RUsMz3f9E49GNINZhrJYZCw'
        }
      })
      
      const fetchResult = await fetchResponse.json()
      
      if (fetchResult.success) {
        console.log('📥 Route fetched successfully!')
        console.log('🎯 Fetched route data:', {
          averagePace: fetchResult.data.routeData.averagePace,
          paceHeartRateSettings: fetchResult.data.routeData.paceHeartRateSettings,
          statsAveragePace: fetchResult.data.stats.averagePace
        })
        
        if (fetchResult.data.routeData.paceHeartRateSettings) {
          console.log('✅ paceHeartRateSettings were saved and retrieved!')
          console.log('🎯 Settings averagePace:', fetchResult.data.routeData.paceHeartRateSettings.averagePace)
        } else {
          console.log('❌ paceHeartRateSettings were NOT saved!')
        }
      } else {
        console.log('❌ Failed to fetch route:', fetchResult.error)
      }
      
    } else {
      console.log('❌ Failed to save route:', result.error)
      console.log('📝 Details:', result.details)
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testPaceSave()