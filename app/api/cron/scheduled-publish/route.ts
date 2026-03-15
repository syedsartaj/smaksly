import { NextRequest, NextResponse } from 'next/server';
import { processScheduledPublish } from '@/jobs/workers/scheduledPublishWorker';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Cron endpoint to publish scheduled posts and expire guest posts.
// Call every 5 minutes via Vercel Cron or external scheduler.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processScheduledPublish();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Scheduled publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
