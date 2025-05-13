import { PrismaClient } from "@/generated/prisma";

// Log database connection information for debugging
const logDatabaseInfo = () => {
  console.log('Database Environment Variables:');
  console.log(`DATABASE_URL exists: ${Boolean(process.env.DATABASE_URL)}`);
  console.log(`POSTGRES_PRISMA_URL exists: ${Boolean(process.env.POSTGRES_PRISMA_URL)}`);
  console.log(`POSTGRES_URL_NON_POOLING exists: ${Boolean(process.env.POSTGRES_URL_NON_POOLING)}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`VERCEL: ${process.env.VERCEL}`);
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

// Get the non-pooling URL for direct connections (needed for some operations on Vercel)
const getDirectUrl = () => {
  if (process.env.POSTGRES_URL_NON_POOLING) {
    return process.env.POSTGRES_URL_NON_POOLING;
  }
  return undefined;
};

// Configure Prisma Client with explicit database URLs
const prismaClientSingleton = () => {
  const url = getDatabaseUrl();
  const directUrl = getDirectUrl();
  
  // Log the connection configuration
  console.log(`Initializing Prisma Client with URL: ${url ? 'Set' : 'Not set'}`);
  console.log(`Direct URL: ${directUrl ? 'Set' : 'Not set'}`);
  
  const clientOptions: any = {
    datasources: {
      db: {
        url,
      },
    },
    // Enable query logging in development
    log: ['error', 'warn', 'info'],
  };
  
  // Add directUrl if available
  if (directUrl) {
    clientOptions.datasources.db.directUrl = directUrl;
  }
  
  return new PrismaClient(clientOptions);
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

// Test the connection and log the result
try {
  prisma.$connect().then(() => {
    console.log('Prisma client connected successfully');
  }).catch(error => {
    console.error('Failed to connect Prisma client:', error);
  });
} catch (error) {
  console.error('Error initializing Prisma client:', error);
}
