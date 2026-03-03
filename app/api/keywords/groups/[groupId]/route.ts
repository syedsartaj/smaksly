import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { KeywordGroup, KeywordMaster } from '@/models';
import mongoose from 'mongoose';

// GET /api/keywords/groups/[groupId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await connectDB();
    const { groupId } = await params;

    if (!mongoose.isValidObjectId(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
    }

    const group = await KeywordGroup.findById(groupId)
      .populate('primaryKeyword', 'keyword volume kd cpc trend country')
      .populate('website', 'name domain niche traffic')
      .populate('blogContent', 'title slug status publishedAt')
      .lean();

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    // Fetch full keyword details for the group members
    const keywords = await KeywordMaster.find({
      _id: { $in: group.keywordMasterIds },
    })
      .select('keyword volume kd cpc trend country region')
      .lean();

    return NextResponse.json({ success: true, data: { ...group, keywords } });
  } catch (error) {
    console.error('[API] GET /keywords/groups/[groupId]:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch group' }, { status: 500 });
  }
}

// PUT /api/keywords/groups/[groupId]
// Edit group name, keywords, niche — marks as user-edited
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await connectDB();
    const { groupId } = await params;

    if (!mongoose.isValidObjectId(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
    }

    const body = await req.json();
    const allowedFields = ['name', 'description', 'niche', 'keywordMasterIds', 'primaryKeywordId', 'status'];
    const updates: Record<string, unknown> = { isUserEdited: true };

    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    // Recompute metrics if keywords changed
    if (Array.isArray(body.keywordMasterIds)) {
      const masters = await KeywordMaster.find({
        _id: { $in: body.keywordMasterIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
      })
        .select('volume kd')
        .lean();

      updates.totalVolume = masters.reduce((s, m) => s + m.volume, 0);
      updates.avgKD = masters.length
        ? Math.round(masters.reduce((s, m) => s + m.kd, 0) / masters.length)
        : 0;
      updates.keywordCount = masters.length;
      updates.priorityScore = Math.round(
        (updates.totalVolume as number) * 0.4 +
        (100 - (updates.avgKD as number)) * 0.3
      );
    }

    const group = await KeywordGroup.findByIdAndUpdate(
      groupId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error('[API] PUT /keywords/groups/[groupId]:', error);
    return NextResponse.json({ success: false, error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE /api/keywords/groups/[groupId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await connectDB();
    const { groupId } = await params;

    if (!mongoose.isValidObjectId(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
    }

    const group = await KeywordGroup.findById(groupId).lean();
    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    if (group.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a published group. Unpublish first.' },
        { status: 400 }
      );
    }

    await KeywordGroup.findByIdAndDelete(groupId);
    return NextResponse.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    console.error('[API] DELETE /keywords/groups/[groupId]:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete group' }, { status: 500 });
  }
}
