#!/usr/bin/env node

/**
 * Script to verify Cloudinary configuration in .env.local file
 * and provide guidance on how to fix it if needed.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENV_FILE_PATH = path.join(__dirname, '..', '.env.local');

// Check if .env.local exists
if (!fs.existsSync(ENV_FILE_PATH)) {
  console.log('\x1b[33m%s\x1b[0m', '.env.local file not found. Creating with Cloudinary template...');
  
  // Create template .env.local file with Cloudinary variables
  const envTemplate = `# Cloudinary credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Existing environment variables below
`;
  
  fs.writeFileSync(ENV_FILE_PATH, envTemplate);
  console.log('\x1b[32m%s\x1b[0m', 'Template .env.local file created!');
  console.log('\x1b[36m%s\x1b[0m', 'Please update it with your Cloudinary credentials from https://cloudinary.com/console');
  process.exit(1);
}

// Read .env.local file
const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');

// Check for Cloudinary variables
const missingVars = [];
if (!envContent.includes('CLOUDINARY_CLOUD_NAME=')) missingVars.push('CLOUDINARY_CLOUD_NAME');
if (!envContent.includes('CLOUDINARY_API_KEY=')) missingVars.push('CLOUDINARY_API_KEY');
if (!envContent.includes('CLOUDINARY_API_SECRET=')) missingVars.push('CLOUDINARY_API_SECRET');

if (missingVars.length > 0) {
  console.log('\x1b[33m%s\x1b[0m', 'Missing Cloudinary variables in .env.local:');
  missingVars.forEach(variable => console.log(`- ${variable}`));
  
  let updatedContent = envContent;
  
  // Add missing variables
  if (!updatedContent.endsWith('\n')) updatedContent += '\n';
  
  // Add missing Cloudinary variables
  if (missingVars.includes('CLOUDINARY_CLOUD_NAME')) {
    updatedContent += 'CLOUDINARY_CLOUD_NAME=your_cloud_name\n';
  }
  if (missingVars.includes('CLOUDINARY_API_KEY')) {
    updatedContent += 'CLOUDINARY_API_KEY=your_api_key\n';
  }
  if (missingVars.includes('CLOUDINARY_API_SECRET')) {
    updatedContent += 'CLOUDINARY_API_SECRET=your_api_secret\n';
  }
  
  fs.writeFileSync(ENV_FILE_PATH, updatedContent);
  
  console.log('\x1b[32m%s\x1b[0m', '.env.local updated with Cloudinary variables!');
  console.log('\x1b[36m%s\x1b[0m', 'Please update them with your actual credentials from https://cloudinary.com/console');
  process.exit(1);
}

// Check if Cloudinary variables have placeholder values
const cloudinaryCloudName = envContent.match(/CLOUDINARY_CLOUD_NAME=([^\r\n]*)/)[1];
const cloudinaryApiKey = envContent.match(/CLOUDINARY_API_KEY=([^\r\n]*)/)[1];
const cloudinaryApiSecret = envContent.match(/CLOUDINARY_API_SECRET=([^\r\n]*)/)[1];

const placeholders = ['your_cloud_name', 'your_api_key', 'your_api_secret'];
if (
  placeholders.includes(cloudinaryCloudName) || 
  placeholders.includes(cloudinaryApiKey) || 
  placeholders.includes(cloudinaryApiSecret)
) {
  console.log('\x1b[33m%s\x1b[0m', 'Cloudinary credentials have placeholder values:');
  if (placeholders.includes(cloudinaryCloudName)) console.log('- CLOUDINARY_CLOUD_NAME has placeholder value');
  if (placeholders.includes(cloudinaryApiKey)) console.log('- CLOUDINARY_API_KEY has placeholder value');
  if (placeholders.includes(cloudinaryApiSecret)) console.log('- CLOUDINARY_API_SECRET has placeholder value');
  
  console.log('\x1b[36m%s\x1b[0m', 'Please update .env.local with your actual Cloudinary credentials from https://cloudinary.com/console');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', 'Cloudinary configuration in .env.local looks good!');
console.log('Cloud Name:', cloudinaryCloudName.substring(0, 3) + '...');
console.log('API Key:', cloudinaryApiKey.substring(0, 3) + '...');
console.log('API Secret:', '********');

// Try to restart the dev server
console.log('\x1b[36m%s\x1b[0m', 'Restarting development server to apply changes...');
try {
  execSync('pkill -f "next dev" || true');
  console.log('\x1b[32m%s\x1b[0m', 'Development server stopped successfully.');
  console.log('\x1b[36m%s\x1b[0m', 'Please restart the development server with: npm run dev');
} catch (error) {
  console.error('Error stopping development server:', error.message);
}
