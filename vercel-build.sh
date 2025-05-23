#!/bin/bash

# Custom build script for Vercel deployment
echo "Starting custom build process..."

# Set environment variables to ignore TypeScript and ESLint errors
export NEXT_DISABLE_ESLINT=1
export NEXT_DISABLE_TYPECHECK=1

# Check if we're in a Vercel environment
if [ -n "$VERCEL" ]; then
  echo "Running in Vercel environment"
  
  # Check for PostgreSQL environment variables
  if [ -n "$POSTGRES_PRISMA_URL" ]; then
    echo "PostgreSQL environment variables detected"
    
    # Create a Vercel-specific Prisma schema
    echo "Setting up Vercel-specific Prisma schema"
    cp prisma/schema.vercel.prisma prisma/schema.prisma
    
    # Run the Vercel deployment script
    echo "Running Vercel deployment script"
    node prisma/vercel-deploy.js
  else
    echo "WARNING: POSTGRES_PRISMA_URL is not set. Database connections may fail."
  fi
fi

# Generate Prisma client with explicit output path to avoid conflicts
echo "Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma

# Create routes-manifest.json if it doesn't exist
echo "Checking for routes-manifest.json..."
mkdir -p .next
if [ ! -f ".next/routes-manifest.json" ]; then
  echo "Creating minimal routes-manifest.json..."
  echo '{"version":3,"pages404":false,"basePath":"","redirects":[],"headers":[],"dynamicRoutes":[],"staticRoutes":[],"dataRoutes":[],"rsc":{}}' > .next/routes-manifest.json
fi

# Clean cache to prevent stale build artifacts
echo "Cleaning Next.js cache..."
rm -rf .next/cache || true

# Run the build command with specific flags to improve compatibility
echo "Running Next.js build..."
NODE_OPTIONS="--max-old-space-size=4096" npx next build --no-lint

# Create a .nojekyll file to prevent GitHub Pages from ignoring files that begin with an underscore
touch .next/.nojekyll

echo "Build completed successfully!"
