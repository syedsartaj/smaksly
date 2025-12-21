import React, { Suspense } from 'react';
import PostForm from './PostForm';

export default function PostPage() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading form...</div>}>
      <PostForm />
    </Suspense>
  );
}
