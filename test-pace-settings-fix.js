// Test script to verify pace settings loading fix
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPaceSettingsLoading() {
  try {
    console.log('🧪 Testing pace settings loading fix...')
    
    // Find a route with paceHeartRateSettings
    const routeWithSettings = await prisma.route.findFirst({
      where: {
        paceHeartRateSettings: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        paceHeartRateSettings: true
      }
    })
    
    if (!routeWithSettings) {
      console.log('❌ No routes with paceHeartRateSettings found')
      return
    }
    
    console.log('✅ Found route with settings:', {
      id: routeWithSettings.id,
      name: routeWithSettings.name,
      paceHeartRateSettings: routeWithSettings.paceHeartRateSettings
    })
    
    // Test the API endpoint
    console.log('🔍 Testing API endpoint...')
    const response = await fetch(`http://localhost:3000/api/routes/${routeWithSettings.id}`)
    const result = await response.json()
    
    if (result.success && result.data.routeData?.paceHeartRateSettings) {
      console.log('✅ API endpoint returns paceHeartRateSettings correctly:', result.data.routeData.paceHeartRateSettings)
    } else {
      console.log('❌ API endpoint missing paceHeartRateSettings:', {
        success: result.success,
        hasPaceSettings: !!result.data?.routeData?.paceHeartRateSettings,
        error: result.error
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPaceSettingsLoading()