import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Check header set by Edge middleware or directly verify cookie
    let userId = req.headers.get('x-user-id');

    if (!userId) {
      const session = await getCurrentUser(req);
      userId = session?.userId || null;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch current user session',
      },
      { status: 500 }
    );
  }
}
