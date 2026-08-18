import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    let instituteName = 'Education Manager';
    let shortName = 'EduManager';
    let description = 'Multi-Tenant Education & Fee Management Platform';
    let logoUrl = '/favicon.ico';
    let themeColor = '#3b82f6';
    let backgroundColor = '#080d1a';

    const session = await getCurrentUser(request);

    if (session && session.organizationId) {
      const settings = await prisma.organizationSetting.findUnique({
        where: { organizationId: session.organizationId },
      });

      if (settings?.instituteName) {
        instituteName = settings.instituteName;
        shortName = settings.instituteName.length > 12 
          ? settings.instituteName.split(' ')[0] 
          : settings.instituteName;
      }
      if (settings?.tagline) {
        description = settings.tagline;
      }
      if (settings?.logoUrl) {
        logoUrl = settings.logoUrl;
      }
    }

    const icons = [
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ];

    const manifest = {
      name: instituteName,
      short_name: shortName,
      description,
      start_url: '/',
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: themeColor,
      orientation: 'portrait-primary',
      scope: '/',
      icons,
      categories: ['education', 'productivity', 'finance'],
    };

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating dynamic manifest:', error);
    const fallbackManifest = {
      name: 'Education Manager',
      short_name: 'EduManager',
      description: 'Multi-Tenant Education Management SaaS',
      start_url: '/',
      display: 'standalone',
      background_color: '#080d1a',
      theme_color: '#3b82f6',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    };
    return NextResponse.json(fallbackManifest);
  }
}
