import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Creates a new PrismaClient instance with connection retry logic
 */
function createPrismaClient() {
  console.log('Creating new PrismaClient instance');
  
  const client = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    errorFormat: 'pretty',
  });

  // Add connection retry logic
  client.$use(async (params, next) => {
    const MAX_RETRIES = 3;
    let retries = 0;
    let result;

    while (retries < MAX_RETRIES) {
      try {
        result = await next(params);
        break;
      } catch (error) {
        retries++;
        if (retries >= MAX_RETRIES) {
          throw error;
        }
        console.log(`Retrying database operation (${retries}/${MAX_RETRIES})...`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }

    return result;
  });

  // Test the connection
  client.$connect()
    .then(() => {
      console.log('Successfully connected to the database');
    })
    .catch((error) => {
      console.error('Failed to connect to the database:', error);
    });

  return client;
}

// Initialize PrismaClient
export const prisma = globalForPrisma.prisma || createPrismaClient();

// Save PrismaClient instance in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

