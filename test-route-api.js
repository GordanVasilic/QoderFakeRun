const jwt = require('jsonwebtoken');

// Test route creation with proper schema
async function testRouteCreation() {
  console.log('Testing route creation with proper schema...');
  
  // Create admin token
  const adminUser = {
    id: 'cmeu1kwjg0000w5zgh3xdrxma',
    email: 'admin@qoderfakerun.com',
    role: 'ADMIN',
    tokenBalance: 1000
  };
  
  const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
  const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '7d' });
  
  console.log('✅ Token generated successfully');
  
  // Create properly formatted route data according to RouteCreationSchema
  const routePayload = {
    name: 'Test Admin Route',
    description: 'Testing admin route creation with proper schema',
    routeData: {
      points: [
        { lat: 44.8125, lng: 20.4612, elevation: 100 },
        { lat: 44.8135, lng: 20.4622, elevation: 105 }
      ],
      distance: 1000, // meters
      duration: 600,  // seconds
      elevationGain: 50,
      averagePace: 6.0 // min/km
    },
    activityType: 'run',
    isPublic: true,
    tags: ['test'],
    chartData: [
      { distance: 0, pace: 6.0, elevation: 100 },
      { distance: 1000, pace: 6.0, elevation: 105 }
    ],
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00'
  };
  
  console.log('📦 Route payload prepared');
  console.log('\n🔧 Use this PowerShell command to test:');
  
  const tokenStr = `"${token}"`;
  const bodyStr = JSON.stringify(routePayload).replace(/"/g, '\"');
  
  console.log(`$token = ${tokenStr}`);
  console.log(`$body = '${JSON.stringify(routePayload)}'`);
  console.log(`try {`);
  console.log(`  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/routes" -Method POST -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token" } -Body $body`);
  console.log(`  Write-Host "✅ Success: $($response | ConvertTo-Json -Depth 3)"`);
  console.log(`} catch {`);
  console.log(`  Write-Host "❌ Error: $($_.Exception.Message)"`);
  console.log(`}`);
}

testRouteCreation().catch(console.error);