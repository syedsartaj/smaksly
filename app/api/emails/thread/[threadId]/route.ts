import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Email } from '@/models/Email';

interface RouteParams {
  params: Promise<{ threadId: string }>;
}

// GET — get full thread conversation
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { threadId } = await params;

    if (!threadId) {
      return NextResponse.json({ success: false, error: 'Thread ID is required' }, { status: 400 });
    }

    const emails = await Email.find({ threadId })
      .sort({ receivedAt: 1 })
      .lean();

    if (emails.length === 0) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 });
    }

    // Mark all inbound emails in thread as read
    await Email.updateMany(
      { threadId, isRead: false, direction: 'inbound' },
      { isRead: true }
    );

    return NextResponse.json({ success: true, data: emails });
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch thread' }, { status: 500 });
  }
}
