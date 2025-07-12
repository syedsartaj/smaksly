import React, { Suspense } from 'react';
import AnalyticsPage from './UserAnalytics';

export default function PostPage() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading Analytics...</div>}>
      <AnalyticsPage />
    </Suspense>
  );
}
