const { RouteCreationSchema } = require('./src/lib/validations');

async function testValidation() {
  const testRoute = {
    name: "Test Route Fix",
    description: "Testing the fixed route creation",
    routeData: {
      distance: 5000, // 5km
      duration: 1800, // 30 minutes
      elevationGain: 100,
      averagePace: 6.0,
      points: [
        { lat: 40.7128, lng: -74.0060, elevation: 10 }, // New York
        { lat: 40.7589, lng: -73.9851, elevation: 15 }, // Times Square
        { lat: 40.7505, lng: -73.9934, elevation: 20 }  // Broadway
      ]
    },
    activityType: "run",
    isPublic: true,
    tags: ["test", "fix"]
  };

  console.log('🧪 Testing validation schema directly...');
  console.log('📋 Test data:', JSON.stringify(testRoute, null, 2));

  try {
    const validation = RouteCreationSchema.safeParse(testRoute);
    
    if (validation.success) {
      console.log('✅ Validation passed!');
      console.log('📄 Validated data:', JSON.stringify(validation.data, null, 2));
      return true;
    } else {
      console.log('❌ Validation failed!');
      console.log('📋 Validation errors:', JSON.stringify(validation.error.errors, null, 2));
      
      // Show specific field errors
      validation.error.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. Path: ${error.path.join('.')} - ${error.message}`);
      });
      
      return false;
    }
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    return false;
  }
}

testValidation().then(success => {
  console.log(success ? '\n🎉 Validation test completed successfully!' : '\n💥 Validation test failed.');
  process.exit(success ? 0 : 1);
});