// Using built-in modules for HTTP requests
const https = require('https');
const http = require('http');

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;
    
    const req = requestModule.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, json: () => jsonData, statusCode: res.statusCode });
        } catch (e) {
          resolve({ ok: false, json: () => ({ error: data }), statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAdminLogin() {
  try {
    console.log('🔐 Testing admin login...');
    
    const loginResponse = await makeRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@qoderfakerun.com',
        password: 'gogo'
      })
    });

    const loginData = await loginResponse.json();
    
    if (loginResponse.ok && loginData.success && loginData.data && loginData.data.token) {
      console.log('✅ Admin login successful!');
      console.log('👤 User:', loginData.data.user);
      console.log('🎫 Token:', loginData.data.token);
      
      // Test route creation with the login token
      console.log('\n🛣️ Testing route creation with login token...');
      
      const routeResponse = await makeRequest('http://localhost:3000/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.data.token}`
        },
        body: JSON.stringify({
          name: 'Login Test Route',
          description: 'Testing route creation with login token',
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
          tags: ['login-test'],
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
        console.log('✅ Route creation successful!');
        console.log('📊 Route data:', routeData);
      } else {
        console.log('❌ Route creation failed:', routeData);
      }
      
    } else {
      console.log('❌ Admin login failed:', loginData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminLogin();