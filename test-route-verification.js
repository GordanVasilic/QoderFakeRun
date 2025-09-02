// Test script to verify route data storage in database
// This can be run after creating a route through the web interface

const { PrismaClient } = require('@prisma/client');

async function testRouteStorage() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking latest routes in database...');
    
    // Get the most recent route
    const latestRoute = await prisma.route.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        routeCoordinates: true,
        routeElevations: true,
        createdAt: true
      }
    });
    
    if (!latestRoute) {
      console.log('❌ No routes found in database');
      return;
    }
    
    console.log('📊 Latest route analysis:');
    console.log('Route ID:', latestRoute.id);
    console.log('Route Name:', latestRoute.name);
    console.log('Created At:', latestRoute.createdAt);
    console.log('Has routeCoordinates:', !!latestRoute.routeCoordinates);
    console.log('Has routeElevations:', !!latestRoute.routeElevations);
    
    if (latestRoute.routeCoordinates) {
      const coordinates = latestRoute.routeCoordinates;
      console.log('✅ routeCoordinates stored as JSONB:');
      console.log('  - Type:', typeof coordinates);
      console.log('  - Is Array:', Array.isArray(coordinates));
      console.log('  - Length:', coordinates.length);
      console.log('  - First coordinate:', coordinates[0]);
      console.log('  - Last coordinate:', coordinates[coordinates.length - 1]);
    } else {
      console.log('❌ routeCoordinates is null/empty');
    }
    
    if (latestRoute.routeElevations) {
      const elevations = latestRoute.routeElevations;
      console.log('✅ routeElevations stored as JSONB:');
      console.log('  - Type:', typeof elevations);
      console.log('  - Is Array:', Array.isArray(elevations));
      console.log('  - Length:', elevations.length);
      console.log('  - First elevation:', elevations[0]);
      console.log('  - Last elevation:', elevations[elevations.length - 1]);
      console.log('  - Min elevation:', Math.min(...elevations));
      console.log('  - Max elevation:', Math.max(...elevations));
    } else {
      console.log('❌ routeElevations is null/empty');
    }
    
    // Check if the data is properly stored vs reconstructed
    if (latestRoute.routeCoordinates && latestRoute.routeElevations) {
      console.log('🎉 SUCCESS: Both routeCoordinates and routeElevations are stored directly!');
      console.log('📈 This should fix the flat graph issue by preserving all route points.');
    } else {
      console.log('⚠️  WARNING: Route data is not being stored directly in JSONB fields.');
    }
    
  } catch (error) {
    console.error('❌ Error checking route storage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testRouteStorage();
}

module.exports = { testRouteStorage };