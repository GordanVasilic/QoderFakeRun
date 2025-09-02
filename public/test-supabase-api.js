// Test route creation and retrieval with Supabase
async function testRouteAPI() {
  try {
    console.log('🧪 Testing Supabase route API...')
    
    // First login to get auth token
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@qoderfakerun.com',
        password: 'admin123'
      })
    })
    
    const loginData = await loginResponse.json()
    console.log('🔐 Login result:', loginData.success ? 'SUCCESS' : 'FAILED')
    
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.error)
      return
    }
    
    const token = loginData.data.token
    console.log('✅ Got auth token')
    
    // Test creating a route
    const routeData = {
      points: [
        { lat: 44.79608946972573, lng: 17.21425360061474, elevation: 151 },
        { lat: 44.76619737147681, lng: 17.18600262409214, elevation: 166 },
        { lat: 44.774917498831314, lng: 17.232853622424244, elevation: 155 }
      ],
      distance: 9.874,
      duration: 7023,
      elevationGain: 49,
      averagePace: 11.85
    }
    
    const createResponse = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        routeData,
        name: 'Test Route - Supabase',
        description: 'Testing Supabase migration',
        date: '2025-08-26',
        startTime: '12:00',
        activityType: 'run',
        chartData: [
          { distance: 0, pace: 5.5, elevation: 151, heartRate: 120 },
          { distance: 5, pace: 6.0, elevation: 166, heartRate: 130 }
        ]
      })
    })
    
    const createData = await createResponse.json()
    console.log('📝 Route creation result:', createData.success ? 'SUCCESS' : 'FAILED')
    
    if (!createData.success) {
      console.error('❌ Route creation failed:', createData.error)
      return
    }
    
    console.log('✅ Route created:', createData.data.id)
    
    // Test fetching routes
    const fetchResponse = await fetch('http://localhost:3000/api/routes?sortBy=createdAt&sortOrder=desc&page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const fetchData = await fetchResponse.json()
    console.log('📋 Route fetch result:', fetchData.success ? 'SUCCESS' : 'FAILED')
    
    if (fetchData.success) {
      console.log('✅ Routes fetched:', fetchData.data.routes.length, 'routes found')
      console.log('📊 Pagination:', fetchData.data.pagination)
    } else {
      console.error('❌ Route fetch failed:', fetchData.error)
    }
    
    console.log('🎉 Supabase migration test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test in browser console
window.testRouteAPI = testRouteAPI
console.log('💡 Run "testRouteAPI()" in the browser console to test Supabase migration')