import React, { Suspense } from 'react';
import PostManagement from './PostManagement';

export default function PostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    }>
      <PostManagement />
    </Suspense>
  );
}
