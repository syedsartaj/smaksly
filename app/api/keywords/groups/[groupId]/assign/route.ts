import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { assignGroupToWebsite, recommendGroupsForWebsite } from '@/services/keywordGroupService';
import mongoose from 'mongoose';

// POST /api/keywords/groups/[groupId]/assign
// Assign a group to a website
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await connectDB();
    const { groupId } = await params;
    const body = await req.json();
    const { websiteId } = body;

    if (!mongoose.isValidObjectId(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
    }

    if (!websiteId || !mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Valid websiteId required' }, { status: 400 });
    }

    await assignGroupToWebsite(groupId, websiteId);

    return NextResponse.json({
      success: true,
      message: `Group assigned to website successfully`,
    });
  } catch (error) {
    console.error('[API] POST /keywords/groups/[groupId]/assign:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign group';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET /api/keywords/groups/[groupId]/assign?websiteId=xxx
// Get recommended groups for a website
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await connectDB();
    const { groupId: websiteId } = await params; // reuse param for websiteId in recommend mode
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '10'));

    if (!mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid websiteId' }, { status: 400 });
    }

    const recommended = await recommendGroupsForWebsite(websiteId, limit);
    return NextResponse.json({ success: true, data: recommended });
  } catch (error) {
    console.error('[API] GET /keywords/groups/[groupId]/assign:', error);
    return NextResponse.json({ success: false, error: 'Failed to get recommendations' }, { status: 500 });
  }
}
