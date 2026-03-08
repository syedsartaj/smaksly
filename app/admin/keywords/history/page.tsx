'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/keywords/rankings'); }, [router]);
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
    </div>
  );
}
