// Test script to create a route and verify data storage
const testRouteData = {
  points: [
    { lat: 40.7128, lng: -74.0060, elevation: 10 },
    { lat: 40.7138, lng: -74.0050, elevation: 15 },
    { lat: 40.7148, lng: -74.0040, elevation: 20 },
    { lat: 40.7158, lng: -74.0030, elevation: 25 },
    { lat: 40.7168, lng: -74.0020, elevation: 30 }
  ],
  distance: 1000,
  duration: 300,
  elevationGain: 20,
  averagePace: 5.0,
  routeCoordinates: [
    [-74.0060, 40.7128],
    [-74.0050, 40.7138],
    [-74.0040, 40.7148],
    [-74.0030, 40.7158],
    [-74.0020, 40.7168]
  ],
  routeElevations: [10, 15, 20, 25, 30]
};

const testChartData = [
  { distance: 0, pace: 5.0, elevation: 10, heartRate: 140 },
  { distance: 250, pace: 4.8, elevation: 15, heartRate: 145 },
  { distance: 500, pace: 5.2, elevation: 20, heartRate: 150 },
  { distance: 750, pace: 4.9, elevation: 25, heartRate: 148 },
  { distance: 1000, pace: 5.1, elevation: 30, heartRate: 142 }
];

console.log('Test route data prepared:');
console.log('Route coordinates count:', testRouteData.routeCoordinates.length);
console.log('Route elevations count:', testRouteData.routeElevations.length);
console.log('Chart data count:', testChartData.length);

// This data can be used to test route creation via the API
module.exports = { testRouteData, testChartData };