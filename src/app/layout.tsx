import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DynamicBrandingProvider } from '@/components/DynamicBrandingProvider';

export const metadata: Metadata = {
  title: 'Education Manager — Multi-Tenant SaaS Platform',
  description: 'Security-First Multi-Tenant Education & Fee Management Platform',
  manifest: '/api/manifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Education Manager',
  },
};

export const viewport: Viewport = {
  themeColor: '#080d1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden w-full max-w-full">
      <head>
        <link rel="manifest" href="/api/manifest" />
      </head>
      <body className="overflow-x-hidden w-full max-w-full min-h-screen bg-slate-50 text-slate-900 touch-pan-y antialiased">
        <DynamicBrandingProvider>
          {children}
        </DynamicBrandingProvider>
      </body>
    </html>
  );
}
