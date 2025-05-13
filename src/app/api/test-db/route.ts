import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  console.log('Running database connection test...');
  
  // Collect environment information
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
    POSTGRES_PRISMA_URL_EXISTS: !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING_EXISTS: !!process.env.POSTGRES_URL_NON_POOLING,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  };
  
  console.log('Environment information:', envInfo);
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful:', result);
    
    // Get database information
    const databaseInfo = await prisma.$queryRaw`SELECT current_database(), version()`;
    console.log('Database info:', databaseInfo);
    
    // Count users as a simple query test
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      environment: envInfo,
      databaseInfo,
      userCount,
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    
    let errorDetails = 'Unknown error';
    if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      environment: envInfo,
      error: errorDetails,
    }, { status: 500 });
  }
}
