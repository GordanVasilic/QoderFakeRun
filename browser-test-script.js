// Browser Console Test Script for Anonymous Wallet Fetch
// Copy and paste this into your browser's developer console to test the network issue

console.log('🧪 Starting browser network test for anonymous wallet fetch...');

// Test function that mimics authStore behavior
async function testAnonymousWalletFetch() {
  const anonymousId = 'test-user-1757355233020'; // The problematic ID from the error
  
  console.log('📋 Test Configuration:');
  console.log('- Anonymous ID:', anonymousId);
  console.log('- Current URL:', window.location.href);
  console.log('- User Agent:', navigator.userAgent);
  console.log('- Online Status:', navigator.onLine);
  
  // Network connection info (if available)
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    console.log('- Connection Type:', connection.effectiveType);
    console.log('- Downlink:', connection.downlink, 'Mbps');
    console.log('- RTT:', connection.rtt, 'ms');
  }
  
  console.log('\n🔍 Testing different URL variants...');
  
  const urlVariants = [
    `/api/tokens/wallet?anonymousId=${anonymousId}`, // Relative URL
    `http://localhost:3000/api/tokens/wallet?anonymousId=${anonymousId}`, // Explicit localhost
    `http://127.0.0.1:3000/api/tokens/wallet?anonymousId=${anonymousId}` // IP address
  ];
  
  for (let i = 0; i < urlVariants.length; i++) {
    const url = urlVariants[i];
    console.log(`\n🔄 Test ${i + 1}/3: ${url}`);
    
    try {
      const startTime = performance.now();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`✅ Response received in ${duration}ms`);
      console.log('- Status:', response.status, response.statusText);
      console.log('- Headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('- Data:', data);
        console.log('🎉 SUCCESS: Wallet fetch completed successfully!');
        return data;
      } else {
        console.error('❌ HTTP Error:', response.status, response.statusText);
      }
      
    } catch (error) {
      console.error(`💥 FAILED: ${error.name}: ${error.message}`);
      console.error('- Error details:', error);
      
      // Additional error analysis
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('🔍 This looks like a network connectivity issue');
      } else if (error.name === 'AbortError') {
        console.error('🔍 Request was aborted (likely timeout)');
      } else if (error.message.includes('CORS')) {
        console.error('🔍 This is a CORS (Cross-Origin Resource Sharing) issue');
      }
    }
  }
  
  console.log('\n🏁 Browser test completed. Check the results above.');
}

// Health check test
async function testHealthEndpoint() {
  console.log('\n🏥 Testing health endpoint...');
  
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check passed:', data);
      return true;
    } else {
      console.error('❌ Health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('💥 Health check error:', error.message);
    return false;
  }
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive network tests...\n');
  
  // Test health endpoint first
  const healthOk = await testHealthEndpoint();
  
  if (healthOk) {
    console.log('\n✅ Health check passed, proceeding with wallet tests...');
    await testAnonymousWalletFetch();
  } else {
    console.log('\n⚠️ Health check failed, but testing wallet anyway...');
    await testAnonymousWalletFetch();
  }
}

// Auto-run the tests
runAllTests();

// Also expose functions for manual testing
window.testAnonymousWalletFetch = testAnonymousWalletFetch;
window.testHealthEndpoint = testHealthEndpoint;

console.log('\n📝 Manual testing functions available:');
console.log('- testAnonymousWalletFetch() - Test the wallet API');
console.log('- testHealthEndpoint() - Test the health check API');