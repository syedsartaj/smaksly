'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TrackerRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/seo/analytics');
  }, [router]);
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
    </div>
  );
}
