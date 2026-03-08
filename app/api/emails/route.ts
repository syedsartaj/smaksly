import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Email } from '@/models/Email';
import mongoose from 'mongoose';

// GET — list emails with pagination, search, folder filter
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const folder = searchParams.get('folder') || 'inbox';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const isRead = searchParams.get('isRead');

    if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) {
      return NextResponse.json({ success: false, error: 'Valid accountId is required' }, { status: 400 });
    }

    const filter: Record<string, unknown> = {
      accountId: new mongoose.Types.ObjectId(accountId),
      folder,
    };

    if (isRead !== null && isRead !== undefined && isRead !== '') {
      filter.isRead = isRead === 'true';
    }

    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { snippet: { $regex: search, $options: 'i' } },
        { 'from.address': { $regex: search, $options: 'i' } },
        { 'from.name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      Email.find(filter)
        .select('from to subject snippet isRead isStarred direction receivedAt threadId')
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Email.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch emails' }, { status: 500 });
  }
}
