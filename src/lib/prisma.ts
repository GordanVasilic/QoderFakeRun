import { PrismaClient } from '@prisma/client'

// Force a new connection each time in development to avoid prepared statement conflicts
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error']
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In development, create a new client each time to avoid prepared statement conflicts
// In production, use singleton pattern for better performance
export const db = process.env.NODE_ENV === 'development' 
  ? createPrismaClient()
  : (globalForPrisma.prisma ?? createPrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Deprecated function - use db directly instead
export function getPrismaClient() {
  console.warn('getPrismaClient() is deprecated. Use db directly instead.');
  return db;
}

// Graceful shutdown handling
const gracefulShutdown = async () => {
  try {
    await db.$disconnect()
    console.log('Prisma client disconnected successfully')
  } catch (error) {
    console.error('Error disconnecting Prisma client:', error)
  }
}

process.on('beforeExit', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)