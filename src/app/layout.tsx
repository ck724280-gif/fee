import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DPR Fee Management System',
  description: 'Fee Management System for DPR Private Tuition',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
