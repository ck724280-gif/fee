import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateTotpSetup, generateRecoveryCodes, encryptSecret } from '@/lib/totp';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { totpSecret: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate new secret and QR code
    const issuer = user.organizationName || 'EduSaaS';
    const { secret, qrCodeDataUrl } = await generateTotpSetup(dbUser.email, issuer);
    const recoveryCodes = generateRecoveryCodes();

    // Encrypt both before storing
    const secretEncrypted = encryptSecret(secret);
    const recoveryCodesEncrypted = encryptSecret(JSON.stringify(recoveryCodes));

    // Upsert pending secret in database (isEnabled remains false until confirmed)
    await prisma.totpSecret.upsert({
      where: { userId: dbUser.id },
      create: {
        userId: dbUser.id,
        secretEncrypted,
        recoveryCodesEncrypted,
        isEnabled: false,
      },
      update: {
        secretEncrypted,
        recoveryCodesEncrypted,
        isEnabled: false,
        verifiedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      qrCodeDataUrl,
      secret, // For manual entry in Google Authenticator
      recoveryCodes,
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while setting up 2FA.' },
      { status: 500 }
    );
  }
}
