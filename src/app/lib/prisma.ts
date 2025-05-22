import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Creates a new PrismaClient instance with enhanced connection retry logic
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

  // Enhanced connection retry logic with automatic reconnection
  client.$use(async (params, next) => {
    const MAX_RETRIES = 5;
    let retries = 0;
    let result;

    while (retries < MAX_RETRIES) {
      try {
        // Log operations for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Executing ${params.model}.${params.action} operation`);
        }
        
        result = await next(params);
        break;
      } catch (error: any) {
        // Enhanced error detection for connection issues
        const isConnectionError = 
          error?.message?.includes('Connection') || 
          error?.message?.includes('connection') ||
          error?.message?.includes('Closed') ||
          error?.message?.includes('timeout') ||
          error?.message?.includes('ECONNREFUSED') ||
          error?.message?.includes('database') ||
          error?.code === 'P1001' || // Authentication failed
          error?.code === 'P1002' || // Database server unreachable
          error?.code === 'P1008' || // Operations timed out
          error?.code === 'P1017';   // Server closed the connection
        
        if (isConnectionError) {
          retries++;
          console.log(`Database connection error detected: ${error.message}`);
          console.log(`Retry attempt ${retries}/${MAX_RETRIES}`);
          
          if (retries >= MAX_RETRIES) {
            console.error('Max retries reached for database connection');
            throw new Error(`Database connection error: ${error.message}. Please try again later.`);
          }
          
          // Attempt to reconnect with exponential backoff
          const waitTime = 1000 * Math.pow(2, retries);
          console.log(`Waiting ${waitTime}ms before reconnecting...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Try to explicitly reconnect
          try {
            await client.$disconnect();
            await new Promise(resolve => setTimeout(resolve, 500)); // Short pause before reconnecting
            await client.$connect();
            console.log('Successfully reconnected to the database');
          } catch (reconnectError) {
            console.error('Failed to reconnect:', reconnectError);
          }
        } else {
          // Not a connection error, just throw it
          console.error(`Database operation error (${params.model}.${params.action}):`, error);
          throw error;
        }
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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
