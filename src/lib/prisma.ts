import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: ['query'],
    // Disable connection pooling to prevent prepared statement conflicts
    __internal: {
      engine: {
        enableEngineDebugMode: false
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export function getPrismaClient(): PrismaClient {
  return db
}

// Ensure clean disconnection
process.on('beforeExit', async () => {
  await db.$disconnect()
})