import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { KeywordGroup, KeywordMaster, Website } from '@/models';
import { markGroupPublished } from '@/services/keywordGroupService';
import { addJob } from '@/lib/queue';
import mongoose from 'mongoose';

// POST /api/keywords/groups/[groupId]/blog
// Trigger blog content generation from a keyword group
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await connectDB();
    const { groupId } = await params;
    const body = await req.json();

    if (!mongoose.isValidObjectId(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
    }

    const group = await KeywordGroup.findById(groupId)
      .populate<{ keywordMasterIds: typeof KeywordMaster[] }>('keywordMasterIds', 'keyword volume kd')
      .lean();

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    if (!group.websiteId) {
      return NextResponse.json(
        { success: false, error: 'Group must be assigned to a website before creating a blog' },
        { status: 400 }
      );
    }

    if (group.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'A blog has already been published for this group' },
        { status: 400 }
      );
    }

    const website = await Website.findById(group.websiteId).lean();
    if (!website) {
      return NextResponse.json({ success: false, error: 'Assigned website not found' }, { status: 404 });
    }

    // Determine focus keyword (primary or highest volume)
    const keywordIds = group.keywordMasterIds as unknown as { _id: mongoose.Types.ObjectId; keyword: string; volume: number }[];
    const primaryKw = group.primaryKeywordId
      ? keywordIds.find((k) => k._id.toString() === group.primaryKeywordId?.toString())
      : keywordIds.sort((a, b) => b.volume - a.volume)[0];

    if (!primaryKw) {
      return NextResponse.json({ success: false, error: 'No keywords in this group' }, { status: 400 });
    }

    // Find the Keyword record for this website (for content generation job)
    const { Keyword } = await import('@/models');
    let kwRecord = await Keyword.findOne({
      websiteId: group.websiteId,
      keyword: primaryKw.keyword,
    }).lean();

    // If no existing keyword record, use overrides from request body
    const title = body.title ?? group.aiSuggestions?.blogTitle ?? `Complete Guide to ${primaryKw.keyword}`;
    const contentType = body.contentType ?? group.aiSuggestions?.contentType ?? 'informational';
    const autoPublish = body.autoPublish ?? false;

    // Mark group as in progress
    await KeywordGroup.findByIdAndUpdate(groupId, { status: 'in_progress' });

    // Queue content generation job
    if (kwRecord) {
      await addJob.contentGeneration({
        websiteId: group.websiteId.toString(),
        keywordId: kwRecord._id.toString(),
        contentType,
        autoPublish,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Blog generation queued for "${title}"`,
      data: {
        groupId,
        websiteId: group.websiteId,
        focusKeyword: primaryKw.keyword,
        title,
        autoPublish,
        status: 'in_progress',
      },
    });
  } catch (error) {
    console.error('[API] POST /keywords/groups/[groupId]/blog:', error);
    return NextResponse.json({ success: false, error: 'Failed to queue blog generation' }, { status: 500 });
  }
}

// PATCH /api/keywords/groups/[groupId]/blog
// Mark group as published after blog goes live
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await connectDB();
    const { groupId } = await params;
    const body = await req.json();
    const { blogContentId, blogUrl } = body;

    if (!mongoose.isValidObjectId(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
    }

    if (!blogContentId || !blogUrl) {
      return NextResponse.json(
        { success: false, error: 'blogContentId and blogUrl required' },
        { status: 400 }
      );
    }

    await markGroupPublished(groupId, blogContentId, blogUrl);

    return NextResponse.json({
      success: true,
      message: 'Group marked as published',
    });
  } catch (error) {
    console.error('[API] PATCH /keywords/groups/[groupId]/blog:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark group published' }, { status: 500 });
  }
}
