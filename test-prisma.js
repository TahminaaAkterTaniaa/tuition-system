const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma client...');
    
    // Check if we can access the Assessment model
    console.log('Assessment model exists:', !!prisma.assessment);
    
    // List all available models
    console.log('Available models in Prisma client:');
    for (const modelName in prisma) {
      if (!modelName.startsWith('_') && typeof prisma[modelName] === 'object') {
        console.log(`- ${modelName}`);
      }
    }
    
    // Try to query the Assessment model
    if (prisma.assessment) {
      const count = await prisma.assessment.count();
      console.log(`Number of assessments in database: ${count}`);
    }
    
    console.log('Prisma test completed successfully');
  } catch (error) {
    console.error('Error testing Prisma client:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
