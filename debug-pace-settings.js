const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugPaceSettings() {
  try {
    console.log('Checking saved routes with paceHeartRateSettings...')
    
    // Get all routes with their paceHeartRateSettings
    const routes = await prisma.route.findMany({
      select: {
        id: true,
        name: true,
        paceHeartRateSettings: true,
        averagePace: true,
        distance: true,
        duration: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })
    
    console.log('\nFound routes:')
    routes.forEach((route, index) => {
      console.log(`\n--- Route ${index + 1} ---`)
      console.log('ID:', route.id)
      console.log('Name:', route.name)
      console.log('Average Pace:', route.averagePace)
      console.log('Distance:', route.distance)
      console.log('Duration:', route.duration)
      console.log('paceHeartRateSettings:', JSON.stringify(route.paceHeartRateSettings, null, 2))
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPaceSettings()