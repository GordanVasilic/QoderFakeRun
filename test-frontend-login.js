// Test frontend login flow using API endpoints
async function testFrontendLogin() {
  console.log('🔍 Testing frontend login flow via API...');
  
  try {
    // Test admin login via API
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@qoderfakerun.com',
        password: 'gogo'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok || !loginData.success) {
      console.log('❌ Login failed:', loginData.error || loginData.message);
      return;
    }
    
    console.log('✅ Login successful!');
    console.log('👤 User:', loginData.data.user);
    console.log('🎫 Token:', loginData.data.token);
    
    const token = loginData.data.token;
    
    // Test token verification by calling profile endpoint
     const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
       method: 'GET',
       headers: {
         'Authorization': `Bearer ${token}`
       }
     });
    
    const profileData = await profileResponse.json();
    
    if (profileResponse.ok) {
      console.log('✅ Token verification successful!');
      console.log('👤 Profile data:', profileData);
    } else {
      console.log('❌ Token verification failed:', profileData.error || profileData.message);
    }
    
    // Test route saving with this token
     console.log('\n🔧 Testing route saving...');
     const routeResponse = await fetch('http://localhost:3000/api/routes', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
      body: JSON.stringify({
        name: 'Test Route',
        description: 'Testing route save',
        routeData: {
          points: [
            { lat: 44.8125, lng: 20.4612, elevation: 100 },
            { lat: 44.8135, lng: 20.4622, elevation: 105 }
          ],
          distance: 1000,
          duration: 600,
          elevationGain: 50,
          averagePace: 6
        },
        activityType: 'run',
        isPublic: true,
        tags: ['test'],
        chartData: [
          { distance: 0, pace: 6, elevation: 100 },
          { distance: 1000, pace: 6, elevation: 105 }
        ],
        date: '2025-08-27',
        startTime: '10:00'
      })
    });
    
    const routeData = await routeResponse.json();
    
    if (routeResponse.ok) {
      console.log('✅ Route saving successful!');
      console.log('📍 Saved route:', routeData);
    } else {
      console.log('❌ Route saving failed:', routeData.error || routeData.message);
      console.log('Response status:', routeResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Use node-fetch for Node.js environment
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

testFrontendLogin().catch(console.error);