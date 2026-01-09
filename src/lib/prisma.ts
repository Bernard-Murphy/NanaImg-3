import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
  })
} else {
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
  prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['query', 'error'],
  })
  globalForPrisma.prisma = prisma
}

export { prisma }
export default prisma

