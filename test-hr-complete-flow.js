// Complete Heart Rate Data Flow Test Script
// This script tests the entire flow from enabling HR to GPX generation

console.log('🧪 Starting Complete Heart Rate Data Flow Test');

// Step 1: Clear storage and enable heart rate
function step1_clearAndEnable() {
  console.log('\n📋 Step 1: Clearing storage and enabling heart rate');
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ SessionStorage cleared');
  
  // Enable heart rate toggle
  const hrToggle = document.querySelector('input[type="checkbox"][id*="heart"], input[type="checkbox"][aria-label*="heart"], input[type="checkbox"][name*="heart"]');
  if (hrToggle && !hrToggle.checked) {
    hrToggle.click();
    console.log('✅ Heart rate toggle enabled');
  } else if (hrToggle && hrToggle.checked) {
    console.log('✅ Heart rate toggle already enabled');
  } else {
    console.log('❌ Heart rate toggle not found');
  }
  
  setTimeout(step2_generateRoute, 1000);
}

// Step 2: Generate a route
function step2_generateRoute() {
  console.log('\n📋 Step 2: Generating route');
  
  // Click on map to create waypoints
  const map = document.querySelector('.mapboxgl-canvas');
  if (map) {
    // Simulate clicks to create a route
    const rect = map.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // First point
    map.dispatchEvent(new MouseEvent('click', {
      clientX: centerX - 50,
      clientY: centerY - 50,
      bubbles: true
    }));
    
    setTimeout(() => {
      // Second point
      map.dispatchEvent(new MouseEvent('click', {
        clientX: centerX + 50,
        clientY: centerY + 50,
        bubbles: true
      }));
      
      setTimeout(step3_checkChartData, 2000);
    }, 500);
  } else {
    console.log('❌ Map canvas not found');
  }
}

// Step 3: Check chart data and heart rate visualization
function step3_checkChartData() {
  console.log('\n📋 Step 3: Checking chart data and heart rate visualization');
  
  // Check if chart is visible
  const chart = document.querySelector('.recharts-wrapper, [data-testid="chart"], .chart-container');
  if (chart) {
    console.log('✅ Chart component found');
  } else {
    console.log('❌ Chart component not found');
  }
  
  // Check for heart rate line in chart
  const hrLine = document.querySelector('.recharts-line[stroke="#dc2626"], .heart-rate-line, [data-key="heartRate"]');
  if (hrLine) {
    console.log('✅ Heart rate line found in chart');
  } else {
    console.log('❌ Heart rate line not found in chart');
  }
  
  setTimeout(step4_saveRoute, 1000);
}

// Step 4: Save the route
function step4_saveRoute() {
  console.log('\n📋 Step 4: Saving route');
  
  const saveButton = document.querySelector('button[aria-label*="save"], button:contains("Save"), .save-button');
  if (saveButton) {
    saveButton.click();
    console.log('✅ Save button clicked');
    
    // Wait for save dialog and fill it
    setTimeout(() => {
      const nameInput = document.querySelector('input[placeholder*="name"], input[name="name"], input[id*="name"]');
      if (nameInput) {
        nameInput.value = 'Test HR Route ' + Date.now();
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('✅ Route name entered');
        
        const confirmButton = document.querySelector('button:contains("Save"), button[type="submit"], .confirm-save');
        if (confirmButton) {
          confirmButton.click();
          console.log('✅ Route saved');
          setTimeout(step5_checkStorage, 1000);
        }
      }
    }, 500);
  } else {
    console.log('❌ Save button not found');
  }
}

// Step 5: Check storage for saved data
function step5_checkStorage() {
  console.log('\n📋 Step 5: Checking storage for saved data');
  
  const keys = Object.keys(sessionStorage);
  console.log('📦 SessionStorage keys:', keys);
  
  const savedRoutes = keys.filter(key => key.startsWith('saved_route_'));
  if (savedRoutes.length > 0) {
    console.log('✅ Found saved routes:', savedRoutes.length);
    
    // Check the latest saved route
    const latestRoute = savedRoutes[savedRoutes.length - 1];
    const routeData = JSON.parse(sessionStorage.getItem(latestRoute));
    
    console.log('📊 Latest route data:', {
      hasChartData: !!(routeData.chartData && routeData.chartData.length > 0),
      chartDataLength: routeData.chartData?.length || 0,
      hasHeartRateData: routeData.chartData?.some(p => p.heartRate && p.heartRate > 0) || false,
      heartRateCount: routeData.chartData?.filter(p => p.heartRate && p.heartRate > 0).length || 0
    });
    
    setTimeout(step6_loadRoute, 1000);
  } else {
    console.log('❌ No saved routes found');
  }
}

// Step 6: Load saved route and check data flow
function step6_loadRoute() {
  console.log('\n📋 Step 6: Loading saved route and checking data flow');
  
  // Click on saved routes or load the route
  const savedRoutesButton = document.querySelector('button:contains("Saved"), .saved-routes-button, [aria-label*="saved"]');
  if (savedRoutesButton) {
    savedRoutesButton.click();
    console.log('✅ Saved routes opened');
    
    setTimeout(() => {
      const routeCard = document.querySelector('.route-card, .saved-route-item, [data-testid="route-card"]');
      if (routeCard) {
        routeCard.click();
        console.log('✅ Route loaded');
        setTimeout(step7_testGPXGeneration, 2000);
      } else {
        console.log('❌ Route card not found');
      }
    }, 500);
  } else {
    console.log('❌ Saved routes button not found');
  }
}

// Step 7: Test GPX generation
function step7_testGPXGeneration() {
  console.log('\n📋 Step 7: Testing GPX generation');
  
  const downloadButton = document.querySelector('button:contains("Download"), button:contains("GPX"), .download-button');
  if (downloadButton) {
    console.log('✅ Download button found');
    
    // Monitor network requests for GPX generation
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      if (args[0].includes('/api/files/generate')) {
        console.log('🌐 GPX generation API call detected');
        return originalFetch.apply(this, args).then(response => {
          console.log('📡 GPX generation response:', response.status);
          return response;
        });
      }
      return originalFetch.apply(this, args);
    };
    
    downloadButton.click();
    console.log('✅ Download initiated');
    
    setTimeout(() => {
      window.fetch = originalFetch; // Restore original fetch
      console.log('\n🎉 Complete Heart Rate Data Flow Test Finished!');
      console.log('\n📋 Manual Verification Steps:');
      console.log('1. Check if heart rate line is visible in the chart');
      console.log('2. Verify that GPX file contains heart rate data in <extensions> tags');
      console.log('3. Look for <gpxtpx:hr> tags in the downloaded GPX file');
    }, 2000);
  } else {
    console.log('❌ Download button not found');
  }
}

// Start the test
step1_clearAndEnable();

// Helper function to find elements by text content
HTMLElement.prototype.contains = function(text) {
  return this.textContent.toLowerCase().includes(text.toLowerCase());
};

// Override querySelector to support :contains pseudo-selector
const originalQuerySelector = document.querySelector;
document.querySelector = function(selector) {
  if (selector.includes(':contains(')) {
    const match = selector.match(/(.*):(contains\(["'](.*)["']\))(.*)/i);
    if (match) {
      const [, prefix, , text, suffix] = match;
      const elements = document.querySelectorAll(prefix + suffix);
      for (let el of elements) {
        if (el.textContent.toLowerCase().includes(text.toLowerCase())) {
          return el;
        }
      }
      return null;
    }
  }
  return originalQuerySelector.call(this, selector);
};