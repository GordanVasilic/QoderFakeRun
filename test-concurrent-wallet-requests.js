const http = require('http');
const { URL } = require('url');

// Generate a test anonymous ID
function generateAnonymousId() {
  const randomString = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  return `anon_${timestamp}_${randomString}`;
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testWalletAPI(anonymousId, requestNumber) {
  const url = `http://localhost:3000/api/tokens/wallet?anonymousId=${anonymousId}`;
  
  try {
    console.log(`🔄 Request ${requestNumber}: Starting wallet API call`);
    const startTime = Date.now();
    
    const response = await makeRequest(url);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`📊 Request ${requestNumber}: Status ${response.status}, Duration: ${duration}ms`);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log(`✅ Request ${requestNumber}: Success -`, data);
      return { success: true, status: response.status, data, duration };
    } else {
      console.log(`❌ Request ${requestNumber}: Error ${response.status} -`, response.data);
      return { success: false, status: response.status, error: response.data, duration };
    }
  } catch (error) {
    console.log(`💥 Request ${requestNumber}: Network error -`, error.message);
    return { success: false, error: error.message, duration: 0 };
  }
}

async function runConcurrentTests() {
  console.log('🚀 Starting concurrent wallet API tests...');
  
  const anonymousId = generateAnonymousId();
  console.log('🆔 Using anonymousId:', anonymousId);
  
  // Test 1: Sequential requests
  console.log('\n📋 Test 1: Sequential requests');
  for (let i = 1; i <= 3; i++) {
    await testWalletAPI(anonymousId, `SEQ-${i}`);
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
  }
  
  // Test 2: Concurrent requests
  console.log('\n📋 Test 2: Concurrent requests');
  const concurrentPromises = [];
  for (let i = 1; i <= 3; i++) {
    concurrentPromises.push(testWalletAPI(anonymousId, `CONC-${i}`));
  }
  
  const results = await Promise.all(concurrentPromises);
  
  // Analyze results
  console.log('\n📊 Results Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log(`✅ Successful requests: ${successful}`);
  console.log(`❌ Failed requests: ${failed}`);
  console.log(`⏱️ Average duration: ${avgDuration.toFixed(2)}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed request details:');
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`  - Request ${index + 1}: Status ${result.status}, Error: ${result.error}`);
    });
  }
}

runConcurrentTests().catch(console.error);