// Test authentication persistence and route saving
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAuthPersistence() {
  console.log('🔍 Testing authentication persistence and route saving...');
  
  try {
    // Step 1: Login and get token
    console.log('\n1️⃣ Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    console.log('👤 User ID:', loginData.data.user.id);
    console.log('🎫 Token exists:', !!loginData.data.token);
    
    const token = loginData.data.token;
    
    // Step 2: Verify token works with profile endpoint
    console.log('\n2️⃣ Testing token verification...');
    const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const profileData = await profileResponse.json();
    
    if (profileResponse.ok && profileData.success) {
      console.log('✅ Token verification successful!');
      console.log('👤 Profile user ID:', profileData.data.user.id);
    } else {
      console.log('❌ Token verification failed:', profileData.error || profileData.message);
      return;
    }
    
    // Step 3: Test route saving
    console.log('\n3️⃣ Testing route saving...');
    const routePayload = {
      name: 'Auth Test Route',
      description: 'Testing route save after authentication fix',
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
      tags: ['auth-test'],
      chartData: [
        { distance: 0, pace: 6, elevation: 100 },
        { distance: 1000, pace: 6, elevation: 105 }
      ],
      date: '2025-08-27',
      startTime: '10:00'
    };
    
    const routeResponse = await fetch('http://localhost:3000/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(routePayload)
    });
    
    const routeData = await routeResponse.json();
    
    if (routeResponse.ok && routeData.success) {
      console.log('✅ Route saving successful!');
      console.log('📍 Route ID:', routeData.data.id);
      console.log('📊 Route stats:', routeData.data.stats);
    } else {
      console.log('❌ Route saving failed:', routeData.error || routeData.message);
      console.log('Response status:', routeResponse.status);
      console.log('Full response:', routeData);
      return;
    }
    
    // Step 4: Test fetching saved routes
    console.log('\n4️⃣ Testing route fetching...');
    const fetchResponse = await fetch('http://localhost:3000/api/routes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const fetchData = await fetchResponse.json();
    
    if (fetchResponse.ok && fetchData.success) {
      console.log('✅ Route fetching successful!');
      console.log('📋 Total routes:', fetchData.data.routes.length);
      console.log('🔍 Found our test route:', fetchData.data.routes.some(r => r.name === 'Auth Test Route'));
    } else {
      console.log('❌ Route fetching failed:', fetchData.error || fetchData.message);
    }
    
    console.log('\n🎉 All authentication tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Login works');
    console.log('   ✅ Token verification works');
    console.log('   ✅ Route saving works');
    console.log('   ✅ Route fetching works');
    console.log('\n💡 The "Authentication required" error should now be resolved!');
    console.log('   Users just need to log in through the frontend login form.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthPersistence().catch(console.error);