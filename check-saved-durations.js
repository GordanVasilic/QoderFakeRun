const { PrismaClient } = require('@prisma/client')

// Check what duration values are actually saved in the database
async function checkSavedDurations() {
  console.log('🔍 Checking saved duration values in database...')
  
  const prisma = new PrismaClient()
  
  try {
    // Get all routes from database
    const routes = await prisma.route.findMany({
      select: {
        id: true,
        name: true,
        distance: true,
        duration: true,
        averagePace: true,
        paceHeartRateSettings: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Get last 10 routes
    })
    
    console.log(`\n📊 Found ${routes.length} routes in database:`)
    
    routes.forEach((route, index) => {
      console.log(`\n${index + 1}. Route: ${route.name}`)
      console.log(`   ID: ${route.id}`)
      console.log(`   Distance: ${route.distance} km`)
      console.log(`   Duration: ${route.duration} seconds = ${Math.floor(route.duration / 60)} minutes ${route.duration % 60} seconds`)
      console.log(`   Average Pace: ${route.averagePace} min/km`)
      
      // Calculate what the duration should be based on distance and pace
      const expectedDuration = route.distance * route.averagePace * 60
      console.log(`   Expected Duration (distance * pace): ${expectedDuration} seconds = ${Math.floor(expectedDuration / 60)} minutes`)
      
      // Calculate actual pace from saved duration and distance
      const actualPace = (route.duration / 60) / route.distance
      console.log(`   Actual Pace (from duration/distance): ${actualPace.toFixed(2)} min/km`)
      
      // Check pace settings if available
      if (route.paceHeartRateSettings) {
        try {
          const settings = typeof route.paceHeartRateSettings === 'string' 
            ? JSON.parse(route.paceHeartRateSettings) 
            : route.paceHeartRateSettings
          console.log(`   Pace Settings: ${settings.averagePace} min/km`)
          
          // Calculate duration based on pace settings
          const settingsBasedDuration = route.distance * settings.averagePace * 60
          console.log(`   Duration from Settings: ${settingsBasedDuration} seconds = ${Math.floor(settingsBasedDuration / 60)} minutes`)
        } catch (e) {
          console.log(`   Pace Settings: Error parsing - ${route.paceHeartRateSettings}`)
        }
      } else {
        console.log(`   Pace Settings: None`)
      }
      
      // Check for discrepancies
      const durationMatch = Math.abs(route.duration - expectedDuration) < 60 // Within 1 minute
      const paceMatch = Math.abs(route.averagePace - actualPace) < 0.1 // Within 0.1 min/km
      
      console.log(`   Duration Consistent: ${durationMatch ? '✅' : '❌'}`)
      console.log(`   Pace Consistent: ${paceMatch ? '✅' : '❌'}`)
      console.log(`   Created: ${route.createdAt.toISOString()}`)
    })
    
    // Summary analysis
    console.log('\n🔍 Analysis Summary:')
    const inconsistentRoutes = routes.filter(route => {
      const expectedDuration = route.distance * route.averagePace * 60
      const actualPace = (route.duration / 60) / route.distance
      const durationMatch = Math.abs(route.duration - expectedDuration) < 60
      const paceMatch = Math.abs(route.averagePace - actualPace) < 0.1
      return !durationMatch || !paceMatch
    })
    
    console.log(`Total routes: ${routes.length}`)
    console.log(`Inconsistent routes: ${inconsistentRoutes.length}`)
    
    if (inconsistentRoutes.length > 0) {
      console.log('\n❌ Routes with inconsistent duration/pace:')
      inconsistentRoutes.forEach(route => {
        console.log(`  - ${route.name}: ${route.duration}s vs expected ${route.distance * route.averagePace * 60}s`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkSavedDurations().catch(console.error)