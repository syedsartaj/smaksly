import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { syncEmailAccount, syncAllAccounts } from '@/lib/email/imap-sync';
import mongoose from 'mongoose';

// POST — trigger IMAP sync
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { accountId } = body;

    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return NextResponse.json({ success: false, error: 'Invalid account ID' }, { status: 400 });
      }

      const result = await syncEmailAccount(accountId);
      return NextResponse.json({
        success: true,
        data: result,
        message: `Synced ${result.fetched} new emails`,
      });
    }

    // Sync all accounts
    const result = await syncAllAccounts();
    return NextResponse.json({
      success: true,
      data: result,
      message: `Synced ${result.total} new emails across all accounts`,
    });
  } catch (error) {
    console.error('Error syncing emails:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync emails' }, { status: 500 });
  }
}
