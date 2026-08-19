import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Public self-service sign-up is disabled on this platform. New organizations and user accounts are created exclusively by the Master Super Administrator.',
      code: 'REGISTRATION_DISABLED',
    },
    { status: 403 }
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Public registration is disabled.',
      code: 'REGISTRATION_DISABLED',
    },
    { status: 403 }
  );
}
