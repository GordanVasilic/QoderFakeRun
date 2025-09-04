// Complete Heart Rate Data Flow Test
// This script tests the entire flow from enabling HR to GPX generation

console.log('🧪 Starting Complete Heart Rate Flow Test');

// Step 1: Clear storage and enable heart rate
function clearStorageAndEnableHR() {
  console.log('🧹 Step 1: Clearing storage and enabling heart rate');
  
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Enable heart rate toggle
  const hrToggle = document.querySelector('input[type="checkbox"]');
  if (hrToggle && !hrToggle.checked) {
    hrToggle.click();
    console.log('✅ Heart rate toggle enabled');
  } else if (hrToggle && hrToggle.checked) {
    console.log('✅ Heart rate toggle already enabled');
  } else {
    console.log('❌ Heart rate toggle not found');
  }
}

// Step 2: Check if route exists and generate if needed
function checkAndGenerateRoute() {
  console.log('🗺️ Step 2: Checking for existing route');
  
  const routePoints = document.querySelectorAll('.mapboxgl-marker');
  console.log('📍 Found', routePoints.length, 'route markers');
  
  if (routePoints.length < 2) {
    console.log('⚠️ No route found. Please manually create a route by clicking on the map to add waypoints.');
    return false;
  }
  
  return true;
}

// Step 3: Check chart data and heart rate visualization
function checkChartData() {
  console.log('📊 Step 3: Checking chart data and heart rate visualization');
  
  // Check for chart elements
  const chartContainer = document.querySelector('.recharts-wrapper');
  if (!chartContainer) {
    console.log('❌ Chart container not found');
    return false;
  }
  
  // Check for heart rate line
  const hrLine = document.querySelector('.recharts-line[stroke="#ef4444"]');
  if (hrLine) {
    console.log('✅ Heart rate line found in chart');
  } else {
    console.log('❌ Heart rate line not found in chart');
  }
  
  // Check chart data in console
  const chartDataElements = document.querySelectorAll('.recharts-dot');
  console.log('📈 Chart data points:', chartDataElements.length);
  
  return true;
}

// Step 4: Save route and check storage
function saveRouteAndCheck() {
  console.log('💾 Step 4: Saving route and checking storage');
  
  const saveButton = document.querySelector('button');
  const saveButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Save') || btn.textContent.includes('save')
  );
  
  if (saveButtons.length > 0) {
    console.log('🔘 Found save buttons:', saveButtons.map(btn => btn.textContent));
    console.log('⚠️ Please manually click the save button to save the route');
  } else {
    console.log('❌ Save button not found');
  }
  
  // Check localStorage after saving
  setTimeout(() => {
    const savedRoutes = localStorage.getItem('saved_routes');
    if (savedRoutes) {
      const routes = JSON.parse(savedRoutes);
      console.log('✅ Routes saved in localStorage:', routes.length);
      
      if (routes.length > 0) {
        const lastRoute = routes[routes.length - 1];
        console.log('📋 Last saved route analysis:', {
          hasChartData: !!lastRoute.chartData,
          chartDataLength: lastRoute.chartData?.length || 0,
          hasHeartRateData: lastRoute.chartData?.some(d => d.heartRate && d.heartRate > 0) || false,
          sampleHeartRates: lastRoute.chartData?.slice(0, 5).map(d => d.heartRate).filter(hr => hr && hr > 0) || []
        });
      }
    } else {
      console.log('❌ No routes found in localStorage');
    }
  }, 2000);
}

// Step 5: Load saved route and check data flow
function loadSavedRouteAndCheck() {
  console.log('📂 Step 5: Loading saved route and checking data flow');
  
  // Navigate to saved routes page
  console.log('⚠️ Please manually navigate to saved routes page and load a route');
  console.log('🔗 URL: http://localhost:3000/saved-routes');
  
  // Function to check after loading
  window.checkAfterLoad = function() {
    console.log('🔍 Checking data flow after loading saved route');
    
    // Check sessionStorage
    const loadRouteData = sessionStorage.getItem('loadRouteData');
    if (loadRouteData) {
      const parsed = JSON.parse(loadRouteData);
      console.log('✅ Route data loaded from sessionStorage:', {
        hasChartData: !!parsed.chartData,
        chartDataLength: parsed.chartData?.length || 0,
        hasHeartRateData: parsed.chartData?.some(d => d.heartRate && d.heartRate > 0) || false
      });
    } else {
      console.log('❌ No route data in sessionStorage');
    }
    
    // Check chart visualization
    setTimeout(() => {
      checkChartData();
    }, 1000);
  };
}

// Step 6: Test GPX generation
function testGPXGeneration() {
  console.log('📄 Step 6: Testing GPX generation');
  
  const downloadButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Download') || btn.textContent.includes('GPX')
  );
  
  if (downloadButtons.length > 0) {
    console.log('📥 Found download buttons:', downloadButtons.map(btn => btn.textContent));
    console.log('⚠️ Please manually click the GPX download button');
    console.log('🔍 Check browser network tab for API calls and console for heart rate data logs');
  } else {
    console.log('❌ Download buttons not found');
  }
}

// Main test function
function runCompleteTest() {
  console.log('🚀 Running Complete Heart Rate Flow Test');
  
  clearStorageAndEnableHR();
  
  setTimeout(() => {
    if (checkAndGenerateRoute()) {
      setTimeout(() => {
        checkChartData();
        saveRouteAndCheck();
      }, 1000);
    }
  }, 500);
  
  console.log('📋 Manual steps required:');
  console.log('1. Create a route by clicking on the map (if not exists)');
  console.log('2. Save the route using the save button');
  console.log('3. Navigate to saved routes and load the route');
  console.log('4. Call checkAfterLoad() function');
  console.log('5. Test GPX download and check network/console logs');
}

// Helper functions for manual testing
window.testHRFlow = {
  runCompleteTest,
  clearStorageAndEnableHR,
  checkAndGenerateRoute,
  checkChartData,
  saveRouteAndCheck,
  loadSavedRouteAndCheck,
  testGPXGeneration,
  checkAfterLoad: () => window.checkAfterLoad && window.checkAfterLoad()
};

// Auto-run the test
runCompleteTest();

console.log('🎯 Test functions available as window.testHRFlow');
console.log('📖 Use window.testHRFlow.runCompleteTest() to run again');