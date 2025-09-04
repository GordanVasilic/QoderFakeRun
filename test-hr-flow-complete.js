// Complete Heart Rate Data Flow Test
// This script tests the entire flow from UI to GPX generation

console.log('🧪 Starting Complete Heart Rate Flow Test');

// Step 1: Clear any existing data
sessionStorage.clear();
localStorage.clear();
console.log('✅ Cleared storage');

// Step 2: Enable heart rate toggle
function enableHeartRateToggle() {
  const toggle = document.querySelector('input[type="checkbox"]');
  if (toggle && !toggle.checked) {
    toggle.click();
    console.log('✅ Heart rate toggle enabled');
    return true;
  } else if (toggle && toggle.checked) {
    console.log('✅ Heart rate toggle already enabled');
    return true;
  } else {
    console.log('❌ Heart rate toggle not found');
    return false;
  }
}

// Step 3: Generate a simple route
function generateTestRoute() {
  // Find the map container
  const mapContainer = document.querySelector('.mapboxgl-canvas');
  if (!mapContainer) {
    console.log('❌ Map not found');
    return false;
  }
  
  // Simulate clicks to create a route
  const rect = mapContainer.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Create start point
  const startEvent = new MouseEvent('click', {
    clientX: centerX - 50,
    clientY: centerY,
    bubbles: true
  });
  mapContainer.dispatchEvent(startEvent);
  
  setTimeout(() => {
    // Create end point
    const endEvent = new MouseEvent('click', {
      clientX: centerX + 50,
      clientY: centerY + 50,
      bubbles: true
    });
    mapContainer.dispatchEvent(endEvent);
    console.log('✅ Test route generated');
    
    // Wait for route processing
    setTimeout(() => {
      checkChartData();
    }, 2000);
  }, 1000);
  
  return true;
}

// Step 4: Check if chart data contains heart rate
function checkChartData() {
  // Look for chart data in the page
  const chartElements = document.querySelectorAll('[data-testid="chart"], .recharts-wrapper');
  console.log('📊 Found', chartElements.length, 'chart elements');
  
  // Check console logs for heart rate data
  console.log('🔍 Checking for heart rate data in component logs...');
  
  // Try to find the save button and save the route
  setTimeout(() => {
    saveRoute();
  }, 1000);
}

// Step 5: Save the route
function saveRoute() {
  const saveButton = document.querySelector('button');
  const buttons = Array.from(document.querySelectorAll('button'));
  const saveBtn = buttons.find(btn => btn.textContent?.includes('Save') || btn.textContent?.includes('save'));
  
  if (saveBtn) {
    saveBtn.click();
    console.log('✅ Route save initiated');
    
    setTimeout(() => {
      checkSavedData();
    }, 1000);
  } else {
    console.log('❌ Save button not found');
    console.log('Available buttons:', buttons.map(btn => btn.textContent));
  }
}

// Step 6: Check saved data in storage
function checkSavedData() {
  const keys = Object.keys(sessionStorage);
  console.log('💾 SessionStorage keys:', keys);
  
  keys.forEach(key => {
    if (key.startsWith('saved_route_')) {
      const data = sessionStorage.getItem(key);
      try {
        const parsed = JSON.parse(data);
        console.log('📊 Saved route data:', {
          key: key,
          hasChartData: !!parsed.chartData,
          chartDataLength: parsed.chartData?.length || 0,
          hasHeartRateData: parsed.chartData?.some(p => p.heartRate && p.heartRate > 0) || false,
          sampleHeartRates: parsed.chartData?.slice(0, 5).map(p => p.heartRate).filter(hr => hr && hr > 0) || []
        });
      } catch (e) {
        console.log('❌ Error parsing saved data:', e);
      }
    }
  });
  
  // Now load the route back
  setTimeout(() => {
    loadSavedRoute();
  }, 1000);
}

// Step 7: Load saved route
function loadSavedRoute() {
  // Clear current route first
  location.reload();
  
  setTimeout(() => {
    // After reload, the saved routes should be available
    console.log('🔄 Page reloaded, checking for saved routes...');
    
    setTimeout(() => {
      testGPXGeneration();
    }, 3000);
  }, 2000);
}

// Step 8: Test GPX generation
function testGPXGeneration() {
  // Look for download or generate buttons
  const buttons = Array.from(document.querySelectorAll('button'));
  const downloadBtn = buttons.find(btn => 
    btn.textContent?.includes('Download') || 
    btn.textContent?.includes('GPX') ||
    btn.textContent?.includes('Generate')
  );
  
  if (downloadBtn) {
    console.log('🎯 Found download button:', downloadBtn.textContent);
    downloadBtn.click();
    console.log('✅ GPX generation initiated');
  } else {
    console.log('❌ Download button not found');
    console.log('Available buttons:', buttons.map(btn => btn.textContent));
  }
}

// Start the test
console.log('🚀 Starting test sequence...');

if (enableHeartRateToggle()) {
  setTimeout(() => {
    generateTestRoute();
  }, 1000);
} else {
  console.log('❌ Cannot proceed without heart rate toggle');
}

// Monitor console for heart rate related logs
const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  if (message.includes('💓') || message.includes('heart') || message.includes('HR')) {
    originalLog.apply(console, ['🔍 HR LOG:', ...args]);
  } else {
    originalLog.apply(console, args);
  }
};

console.log('🧪 Test script loaded. Monitor console for heart rate data flow.');