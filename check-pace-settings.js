const { PrismaClient } = require('@prisma/client')

async function checkPaceSettings() {
  const prisma = new PrismaClient()
  
  try {
    const routes = await prisma.route.findMany({
      select: {
        id: true,
        name: true,
        averagePace: true,
        paceHeartRateSettings: true
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('Routes with pace settings:')
    routes.forEach(route => {
      console.log(`\n${route.name}:`)
      console.log(`  avgPace: ${route.averagePace}`)
      console.log(`  paceHeartRateSettings: ${JSON.stringify(route.paceHeartRateSettings, null, 2)}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPaceSettings()