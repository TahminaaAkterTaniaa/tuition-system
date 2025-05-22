#!/usr/bin/env node

/**
 * Migration runner script
 * 
 * This script compiles and runs TypeScript migration scripts
 * Usage: node scripts/run-migration.js <migration-name>
 * Example: node scripts/run-migration.js reset-classes-for-scheduling
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the migration name from command line arguments
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Error: Migration name is required');
  console.log('Usage: node scripts/run-migration.js <migration-name>');
  console.log('Example: node scripts/run-migration.js reset-classes-for-scheduling');
  process.exit(1);
}

// Check if the migration file exists
const migrationPath = path.join(__dirname, 'migrations', `${migrationName}.ts`);
if (!fs.existsSync(migrationPath)) {
  console.error(`Error: Migration file not found: ${migrationPath}`);
  process.exit(1);
}

console.log(`Running migration: ${migrationName}`);

try {
  // Compile and run the migration
  execSync(`npx ts-node ${migrationPath}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
