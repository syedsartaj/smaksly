import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { generateBlogSuggestions } from '@/services/keywordGroupService';
import mongoose from 'mongoose';

// POST /api/keywords/groups/[groupId]/suggest
// Generate AI blog topic suggestions for a group (gpt-4o-mini)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await connectDB();
    const { groupId } = await params;

    if (!mongoose.isValidObjectId(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
    }

    const suggestion = await generateBlogSuggestions(groupId);

    return NextResponse.json({
      success: true,
      data: suggestion,
      message: 'AI blog suggestion generated and saved to group',
    });
  } catch (error) {
    console.error('[API] POST /keywords/groups/[groupId]/suggest:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate suggestions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
