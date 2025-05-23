// This script is used for Vercel deployments to ensure the database is properly set up
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel deployment preparation...');

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1';
console.log(`Running in Vercel environment: ${isVercel}`);

// Log available environment variables for debugging
console.log('Environment variables:');
console.log(`- DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
console.log(`- POSTGRES_PRISMA_URL exists: ${!!process.env.POSTGRES_PRISMA_URL}`);
console.log(`- POSTGRES_URL_NON_POOLING exists: ${!!process.env.POSTGRES_URL_NON_POOLING}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);

// Function to create a PostgreSQL-specific schema file for Vercel
function createVercelSchema() {
  console.log('Creating Vercel-specific Prisma schema...');
  
  // Read the original schema
  const originalSchemaPath = path.join(__dirname, 'schema.prisma');
  let schemaContent = fs.readFileSync(originalSchemaPath, 'utf8');
  
  // Replace the datasource with PostgreSQL configuration
  schemaContent = schemaContent.replace(
    /datasource db {[^}]+}/s,
    `datasource db {
  provider = "postgresql"
  url = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}`
  );
  
  // Ensure the output directory is correctly specified
  schemaContent = schemaContent.replace(
    /generator client {[^}]+}/s,
    `generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}`
  );
  
  // Write the modified schema to a new file
  const vercelSchemaPath = path.join(__dirname, 'schema.vercel.prisma');
  fs.writeFileSync(vercelSchemaPath, schemaContent);
  console.log(`Created Vercel schema at ${vercelSchemaPath}`);
  
  return vercelSchemaPath;
}

// Main execution
try {
  // Create Vercel schema if needed
  let schemaPath;
  if (isVercel && process.env.POSTGRES_PRISMA_URL) {
    schemaPath = createVercelSchema();
    
    // Set environment variable to use the Vercel schema
    process.env.PRISMA_SCHEMA_PATH = schemaPath;
    console.log(`Set PRISMA_SCHEMA_PATH to ${schemaPath}`);
    
    // Generate Prisma client with the Vercel schema
    console.log('Generating Prisma client with Vercel schema...');
    execSync(`npx prisma generate --schema=${schemaPath}`, { stdio: 'inherit' });
    
    // Copy the schema to the main schema location for Vercel to use
    fs.copyFileSync(schemaPath, path.join(__dirname, 'schema.prisma'));
    console.log('Copied Vercel schema to main schema location');
  } else {
    // Use default schema for local development
    schemaPath = path.join(__dirname, 'schema.prisma');
    console.log(`Using default schema at ${schemaPath}`);
    
    // Generate Prisma client with the default schema
    console.log('Generating Prisma client with default schema...');
    execSync('npx prisma generate', { stdio: 'inherit' });
  }
  
  console.log('Prisma client generation completed successfully');
} catch (error) {
  console.error('Error during Vercel deployment preparation:', error);
  // Don't exit with error code to allow build to continue
  console.log('Continuing with deployment despite errors...');
}
