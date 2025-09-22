// Simple debug script to test wallet API

async function debugWalletError() {
  try {
    console.log('🔍 Debugging wallet API error...');
    
    // Generate a fresh anonymous ID like the frontend does
    const anonymousId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    console.log('Generated anonymousId:', anonymousId);
    
    // Test the wallet API endpoint
    const url = `http://localhost:3000/api/tokens/wallet?anonymousId=${anonymousId}`;
    console.log('Testing URL:', url);
    
    const response = await fetch(url);
    
    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ Response not OK');
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Success response:', result);
    
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugWalletError();