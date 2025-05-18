const { PrismaClient } = require('./src/generated/prisma');

// Create a new instance of PrismaClient
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Try a simple query to test the connection
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Connection successful!', result);
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection()
  .then((success) => {
    console.log('Test completed, connection ' + (success ? 'successful' : 'failed'));
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
