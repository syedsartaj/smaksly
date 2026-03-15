import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models/Website';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    await connectDB();
    const { websiteId } = await params;
    const body = await request.json();
    const { domainProvider, domainExpiryDate } = body;

    const update: Record<string, any> = {};
    if (domainProvider !== undefined) update.domainProvider = domainProvider;
    if (domainExpiryDate !== undefined) update.domainExpiryDate = domainExpiryDate ? new Date(domainExpiryDate) : null;

    const website = await Website.findByIdAndUpdate(websiteId, update, { new: true });
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ website });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
