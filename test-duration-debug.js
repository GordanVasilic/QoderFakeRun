const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
const jwt = require('jsonwebtoken')

// Test to debug duration saving and display issues
async function testDurationDebug() {
  console.log('🔍 Testing Duration Debug...')
  
  try {
    // Generate admin token with correct user ID and JWT secret
    const adminToken = jwt.sign(
      { 
        id: 'cmeu1kwjg0000w5zgh3xdrxma', 
        email: 'admin@qoderfakerun.com',
        role: 'ADMIN'
      }, 
      process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '1h' }
    )
    
    console.log('🔑 Generated admin token')
    
    // Test route data - similar to what user would create
    const testRouteData = {
      points: [
        { lat: 44.8125, lng: 20.4612, elevation: 100 },
        { lat: 44.8200, lng: 20.4700, elevation: 110 }
      ],
      distance: 4.65, // km
      duration: 1800, // 30 minutes in seconds (should be ~25-30 min for 5 min/km pace)
      elevationGain: 24,
      averagePace: 5.0 // min/km
    }
    
    console.log('📊 Test Route Data:')
    console.log('  Distance:', testRouteData.distance, 'km')
    console.log('  Duration:', testRouteData.duration, 'seconds =', Math.floor(testRouteData.duration / 60), 'minutes')
    console.log('  Average Pace:', testRouteData.averagePace, 'min/km')
    console.log('  Expected Duration (distance * pace):', testRouteData.distance * testRouteData.averagePace, 'minutes')
    console.log('  Expected Duration in seconds:', testRouteData.distance * testRouteData.averagePace * 60, 'seconds')
    
    // Create route via API
    const payload = {
      name: 'Duration Debug Test',
      description: 'Testing duration calculation and storage',
      routeData: testRouteData,
      isPublic: false,
      activityType: 'run',
      date: '2024-01-15',
      startTime: '08:00',
      paceHeartRateSettings: {
        averagePace: 5.0,
        paceInconsistency: 30,
        includeHeartRate: false,
        averageHeartRate: 150,
        heartRateVariability: 20
      }
    }
    
    console.log('\n📤 Creating route...')
    const createResponse = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    })
    
    const createResult = await createResponse.json()
    console.log('✅ Route created:', createResult)
    
    if (createResult.success && createResult.data?.id) {
      const routeId = createResult.data.id
      
      // Fetch the saved route to see what was actually stored
      console.log('\n📥 Fetching saved route...')
      const fetchResponse = await fetch(`http://localhost:3000/api/routes/${routeId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })
      
      const fetchResult = await fetchResponse.json()
      console.log('📊 Saved Route Data:')
      
      if (fetchResult.success && fetchResult.data) {
        const savedRoute = fetchResult.data
        console.log('  Saved Distance:', savedRoute.stats?.distance, 'km')
        console.log('  Saved Duration:', savedRoute.stats?.duration, 'seconds =', Math.floor(savedRoute.stats?.duration / 60), 'minutes')
        console.log('  Saved Average Pace:', savedRoute.stats?.averagePace, 'min/km')
        console.log('  Saved Pace Settings:', savedRoute.routeData?.paceHeartRateSettings)
        
        // Calculate what the duration should be based on saved pace
        if (savedRoute.routeData?.paceHeartRateSettings?.averagePace) {
          const expectedDuration = savedRoute.stats.distance * savedRoute.routeData.paceHeartRateSettings.averagePace * 60
          console.log('  Expected Duration (from saved pace):', expectedDuration, 'seconds =', Math.floor(expectedDuration / 60), 'minutes')
        }
        
        // Check for discrepancies
        console.log('\n🔍 Analysis:')
        console.log('  Original Duration:', testRouteData.duration, 'seconds')
        console.log('  Saved Duration:', savedRoute.stats?.duration, 'seconds')
        console.log('  Duration Match:', testRouteData.duration === savedRoute.stats?.duration ? '✅' : '❌')
        
        console.log('  Original Pace:', testRouteData.averagePace, 'min/km')
        console.log('  Saved Pace:', savedRoute.stats?.averagePace, 'min/km')
        console.log('  Pace Match:', testRouteData.averagePace === savedRoute.stats?.averagePace ? '✅' : '❌')
        
        // Calculate actual pace from saved data
        if (savedRoute.stats?.duration && savedRoute.stats?.distance) {
          const actualPace = (savedRoute.stats.duration / 60) / savedRoute.stats.distance
          console.log('  Calculated Pace (from saved duration/distance):', actualPace.toFixed(2), 'min/km')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the test
testDurationDebug().catch(console.error)