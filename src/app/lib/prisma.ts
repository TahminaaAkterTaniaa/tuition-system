import { PrismaClient } from "@/generated/prisma";

// Log database connection information for debugging
const logDatabaseInfo = () => {
  console.log('Database Environment Variables:');
  console.log(`DATABASE_URL exists: ${Boolean(process.env.DATABASE_URL)}`);
  console.log(`POSTGRES_PRISMA_URL exists: ${Boolean(process.env.POSTGRES_PRISMA_URL)}`);
  console.log(`POSTGRES_URL_NON_POOLING exists: ${Boolean(process.env.POSTGRES_URL_NON_POOLING)}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
};

// Call this function to log database info
logDatabaseInfo();

// Determine which database URL to use
const getDatabaseUrl = () => {
  // First priority: Vercel Postgres URL
  if (process.env.POSTGRES_PRISMA_URL) {
    console.log('Using POSTGRES_PRISMA_URL for database connection');
    return process.env.POSTGRES_PRISMA_URL;
  }
  
  // Second priority: Standard DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for database connection');
    return process.env.DATABASE_URL;
  }
  
  // Fallback for development
  console.log('No database URL found, using fallback');
  return 'postgresql://postgres:postgres@localhost:5432/tuition-system';
};

// Configure Prisma Client with explicit database URL
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    // Enable query logging in development
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Use globalThis to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create or reuse Prisma Client instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Save the instance in development to prevent connection exhaustion
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
