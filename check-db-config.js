const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Checking database configuration...');

// Check DATABASE_URL
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  // Mask the password in the URL for security
  const maskedUrl = process.env.DATABASE_URL.replace(/(postgres:\/\/\w+:)([^@]+)(@.+)/, '$1*****$3');
  console.log('DATABASE_URL (masked):', maskedUrl);
}

// Check Prisma schema
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Extract database provider
  const providerMatch = schema.match(/provider\s*=\s*"([^"]+)"/);
  if (providerMatch) {
    console.log('Database provider:', providerMatch[1]);
  }
  
  // Extract database URL source
  const urlMatch = schema.match(/url\s*=\s*env\("([^"]+)"\)/);
  if (urlMatch) {
    console.log('Database URL env variable:', urlMatch[1]);
    console.log('Env variable exists:', !!process.env[urlMatch[1]]);
  }
}

// Check Prisma client path
const prismaClientPath = path.join(__dirname, 'src', 'generated', 'prisma');
console.log('Prisma client directory exists:', fs.existsSync(prismaClientPath));

console.log('Database configuration check completed.');
