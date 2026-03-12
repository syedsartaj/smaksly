import { NextRequest, NextResponse } from 'next/server';
import { syncAllAccounts } from '@/lib/email/imap-sync';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Called by Cloud Scheduler every 5 minutes
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron/EmailSync] Starting email sync...');
    const result = await syncAllAccounts();

    console.log(`[Cron/EmailSync] Done: ${result.total} emails synced, ${result.errors.length} errors`);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      fetched: result.total,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[Cron/EmailSync] Failed:', error);
    return NextResponse.json(
      { error: 'Email sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
