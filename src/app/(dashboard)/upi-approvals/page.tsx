'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UpiApprovalsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/payments?tab=approvals');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-slate-400 text-xs">
      <span>Redirecting to Payments &amp; UPI Approvals...</span>
    </div>
  );
}
