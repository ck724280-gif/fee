import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, PRE_2FA_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.delete(COOKIE_NAME);
  response.cookies.delete(PRE_2FA_COOKIE_NAME);
  response.cookies.delete('dpr_auth_token');

  return response;
}
