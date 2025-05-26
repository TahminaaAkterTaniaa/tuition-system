import { NextResponse, NextRequest } from 'next/server';

/**
 * This endpoint has been disabled to prevent test notifications from appearing in the UI.
 * Real notifications will be generated when actual class approval/rejection actions occur.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    error: "This endpoint has been disabled. Real notifications will appear when actual actions occur."
  }, { status: 403 });
}
