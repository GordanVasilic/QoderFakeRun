const { PrismaClient } = require('../generated/prisma')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 12)
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@fakerun.pro' },
    update: {},
    create: {
      email: 'demo@fakerun.pro',
      username: 'demo_user',
      firstName: 'Demo',
      lastName: 'User',
      passwordHash: hashedPassword,
      isPublic: true,
      activityType: 'RUN',
      paceUnit: 'METRIC',
    },
  })

  console.log('👤 Created demo user:', demoUser.email)

  // Create system settings
  const settings = [
    {
      key: 'default_rate_limit',
      value: '100',
      description: 'Default API rate limit per minute',
      category: 'api',
      isPublic: false,
    },
    {
      key: 'max_route_points',
      value: '1000',
      description: 'Maximum points allowed per route',
      category: 'limits',
      isPublic: true,
    },
    {
      key: 'max_route_distance',
      value: '1000',
      description: 'Maximum route distance in kilometers',
      category: 'limits',
      isPublic: true,
    },
    {
      key: 'enable_public_routes',
      value: 'true',
      description: 'Allow public route sharing',
      category: 'features',
      isPublic: true,
    },
    {
      key: 'enable_route_export',
      value: 'true',
      description: 'Allow route file exports',
      category: 'features',
      isPublic: true,
    },
  ]

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  console.log('⚙️  Created system settings')

  // Create default tags
  const tags = [
    { name: 'beginner', description: 'Suitable for beginners', color: '#22c55e' },
    { name: 'intermediate', description: 'Intermediate difficulty', color: '#f59e0b' },
    { name: 'advanced', description: 'Advanced route', color: '#ef4444' },
    { name: 'scenic', description: 'Scenic route with beautiful views', color: '#3b82f6' },
    { name: 'urban', description: 'City/urban route', color: '#6b7280' },
    { name: 'trail', description: 'Trail or nature route', color: '#10b981' },
    { name: 'hills', description: 'Hilly terrain', color: '#f97316' },
    { name: 'flat', description: 'Flat terrain', color: '#84cc16' },
    { name: 'park', description: 'Park route', color: '#16a34a' },
    { name: 'waterfront', description: 'Route along water', color: '#0ea5e9' },
  ]

  const createdTags = []
  for (const tag of tags) {
    const createdTag = await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    })
    createdTags.push(createdTag)
  }

  console.log('🏷️  Created tags:', createdTags.length)

  // Create sample routes using raw SQL for PostGIS geometry
  const sampleRoutes = [
    {
      name: 'Central Park Loop',
      description: 'A beautiful loop around Central Park in New York City',
      lineString: 'LINESTRING(-73.9580 40.8006, -73.9540 40.7989, -73.9500 40.7972, -73.9480 40.7955, -73.9580 40.8006)',
      distance: 6.1,
      duration: 1830, // 30:30
      elevationGain: 45,
      averagePace: 5.0,
      activityType: 'RUN',
      isPublic: true,
      tags: ['beginner', 'park', 'scenic'],
    },
    {
      name: 'Golden Gate Bridge Run',
      description: 'Iconic run across the Golden Gate Bridge',
      lineString: 'LINESTRING(-122.4783 37.8199, -122.4700 37.8257, -122.4600 37.8300, -122.4500 37.8330)',
      distance: 4.2,
      duration: 1260, // 21:00
      elevationGain: 120,
      averagePace: 5.0,
      activityType: 'RUN',
      isPublic: true,
      tags: ['intermediate', 'scenic', 'hills'],
    },
    {
      name: 'Hyde Park Circuit',
      description: 'Classic London park run through Hyde Park',
      lineString: 'LINESTRING(-0.1650 51.5074, -0.1620 51.5050, -0.1580 51.5030, -0.1540 51.5010, -0.1650 51.5074)',
      distance: 5.0,
      duration: 1500, // 25:00
      elevationGain: 25,
      averagePace: 5.0,
      activityType: 'RUN',
      isPublic: true,
      tags: ['beginner', 'park', 'flat'],
    },
  ]

  for (const route of sampleRoutes) {
    try {
      // Insert route using raw SQL to handle PostGIS geometry
      const routeResult = await prisma.$queryRaw`
        INSERT INTO routes (
          id, name, description, geometry, distance, duration,
          \"elevationGain\", \"averagePace\", \"activityType\", \"pointCount\",
          \"isPublic\", \"userId\", \"createdAt\", \"updatedAt\"
        ) VALUES (
          gen_random_uuid()::text,
          ${route.name},
          ${route.description},
          ST_GeomFromText(${route.lineString}, 4326),
          ${route.distance},
          ${route.duration},
          ${route.elevationGain},
          ${route.averagePace},
          ${route.activityType}::activity_type,
          5,
          ${route.isPublic},
          ${demoUser.id},
          NOW(),
          NOW()
        )
        RETURNING id
      `

      // Get the created route ID
      const createdRoute = await prisma.$queryRaw`
        SELECT id FROM routes WHERE name = ${route.name} AND \"userId\" = ${demoUser.id}
      `

      const routeId = createdRoute[0]?.id
      if (routeId) {
        // Add tags to route
        for (const tagName of route.tags) {
          const tag = createdTags.find(t => t.name === tagName)
          if (tag) {
            await prisma.routeTag.create({
              data: {
                routeId,
                tagId: tag.id,
              },
            })
          }
        }
        console.log(`🗺️  Created route: ${route.name}`)
      }
    } catch (error) {
      console.error(`❌ Failed to create route ${route.name}:`, error)
    }
  }

  // Create a demo API key
  await prisma.apiKey.create({
    data: {
      key: 'demo_key_' + Math.random().toString(36).substring(2, 15),
      name: 'Demo API Key',
      userId: demoUser.id,
      rateLimit: 1000,
      windowMs: 60000,
      isActive: true,
    },
  })

  console.log('🔑 Created demo API key')

  console.log('✅ Database seeding completed!')
  console.log('\n📊 Summary:')
  console.log(`   - Users: 1`)
  console.log(`   - Tags: ${createdTags.length}`)
  console.log(`   - Routes: ${sampleRoutes.length}`)
  console.log(`   - Settings: ${settings.length}`)
  console.log('\n🎯 Demo credentials:')
  console.log('   Email: demo@fakerun.pro')
  console.log('   Password: demo123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })