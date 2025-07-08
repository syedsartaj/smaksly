import React, { Suspense } from 'react';
import Blogeditpage from './Blogeditpage';

export default function PostPage() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading form...</div>}>
      <Blogeditpage />
    </Suspense>
  );
}
