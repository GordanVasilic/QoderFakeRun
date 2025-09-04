// Test script to verify heart rate data flow
// This script should be run in browser console

console.log('🧪 Starting Heart Rate Data Flow Test');

// Step 1: Clear any existing data
localStorage.clear();
sessionStorage.clear();
console.log('✅ Cleared storage');

// Step 2: Check if heart rate toggle is enabled
const hrToggle = document.querySelector('input[type="checkbox"]');
if (hrToggle && !hrToggle.checked) {
  hrToggle.click();
  console.log('✅ Enabled heart rate toggle');
} else {
  console.log('ℹ️ Heart rate toggle already enabled or not found');
}

// Step 3: Instructions for manual testing
console.log('📋 Manual Test Steps:');
console.log('1. Generate a new route by clicking on the map');
console.log('2. Check that heart rate line appears on the chart');
console.log('3. Save the route using "Save Route" button');
console.log('4. Reload the page');
console.log('5. Load the saved route');
console.log('6. Check console logs for heart rate data flow');
console.log('7. Try to download GPX and check if heart rate data is included');

// Helper function to check chart data
window.checkChartData = function() {
  const chartElements = document.querySelectorAll('[data-testid="chart"], .recharts-wrapper');
  console.log('📊 Chart elements found:', chartElements.length);
  
  // Check for heart rate line in chart
  const hrLines = document.querySelectorAll('.recharts-line[stroke*="red"], .recharts-line[stroke*="#ef4444"]');
  console.log('💓 Heart rate lines found:', hrLines.length);
  
  return {
    chartElements: chartElements.length,
    heartRateLines: hrLines.length
  };
};

// Helper function to check localStorage for saved routes
window.checkSavedRoutes = function() {
  const savedRoutes = Object.keys(localStorage).filter(key => key.startsWith('route_'));
  console.log('💾 Saved routes found:', savedRoutes.length);
  
  savedRoutes.forEach(routeKey => {
    const routeData = JSON.parse(localStorage.getItem(routeKey));
    console.log(`📍 Route ${routeKey}:`, {
      hasChartData: !!routeData.chartData,
      chartDataLength: routeData.chartData?.length || 0,
      hasHeartRateData: routeData.chartData?.some(p => p.heartRate && p.heartRate > 0) || false
    });
  });
  
  return savedRoutes;
};

console.log('🚀 Test helpers loaded. Use checkChartData() and checkSavedRoutes() to inspect data.');