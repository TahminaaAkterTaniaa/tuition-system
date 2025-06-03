import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function GET(request: NextRequest) {
  try {
    // Return masked cloudinary config for debugging
    const config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 
        `${process.env.CLOUDINARY_CLOUD_NAME.substring(0, 3)}...` : 'missing',
      api_key: process.env.CLOUDINARY_API_KEY ? 
        `${process.env.CLOUDINARY_API_KEY.substring(0, 3)}...` : 'missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'present but hidden' : 'missing',
    };

    // Check if we can ping Cloudinary
    let pingResult = 'Not attempted';
    try {
      // This is a lightweight operation to check connectivity
      const result = await cloudinary.api.ping();
      pingResult = result.status === 'ok' ? 'success' : 'failed';
    } catch (error) {
      pingResult = `error: ${error instanceof Error ? error.message : 'unknown error'}`;
    }

    return NextResponse.json({
      config,
      pingResult,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
