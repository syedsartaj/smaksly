import React, { Suspense } from 'react';
import HeaderFooterEditor from './edit';

export default function PostPage() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading form...</div>}>
      <HeaderFooterEditor />
    </Suspense>
  );
}
