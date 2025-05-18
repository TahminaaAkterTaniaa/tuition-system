import { PrismaClient } from '@prisma/client';

// Add prisma to the NodeJS global type
declare global {
  var prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prismaGlobal = global as unknown as { prisma: PrismaClient };

// Function to create a new PrismaClient instance
function createPrismaClient() {
  console.log('Creating new PrismaClient instance');
  
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Initialize PrismaClient
export const prisma = prismaGlobal.prisma || createPrismaClient();

// Save PrismaClient instance in development
if (process.env.NODE_ENV !== 'production') {
  prismaGlobal.prisma = prisma;
}

