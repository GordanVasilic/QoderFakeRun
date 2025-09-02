const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugPaceData() {
  try {
    console.log('🔍 Checking routes with pace data...')
    
    const routes = await prisma.route.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        name: true,
        averagePace: true,
        paceHeartRateSettings: true,
        createdAt: true
      }
    })
    
    console.log('📊 Found', routes.length, 'routes:')
    
    routes.forEach((route, index) => {
      console.log(`\n${index + 1}. Route: ${route.name}`)
      console.log(`   ID: ${route.id}`)
      console.log(`   Average Pace (DB): ${route.averagePace}`)
      console.log(`   Pace HR Settings:`, route.paceHeartRateSettings)
      console.log(`   Created: ${route.createdAt}`)
      
      if (route.paceHeartRateSettings) {
        const settings = route.paceHeartRateSettings
        console.log(`   Settings Average Pace: ${settings.averagePace}`)
        console.log(`   Settings Include HR: ${settings.includeHeartRate}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPaceData()