import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getLatestRankings, getKeywordTrend } from '@/services/keywordMasterService';
import mongoose from 'mongoose';

// GET /api/seo/tracker/[websiteId]/keywords
// Per-keyword ranking data for a website
// Params: mode (latest|trend), keywordMasterId, days
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    await connectDB();
    const { websiteId } = await params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') ?? 'latest';
    const keywordMasterId = searchParams.get('keywordMasterId');
    const days = Math.min(365, parseInt(searchParams.get('days') ?? '30'));

    if (!mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid websiteId' }, { status: 400 });
    }

    if (mode === 'trend' && keywordMasterId) {
      if (!mongoose.isValidObjectId(keywordMasterId)) {
        return NextResponse.json({ success: false, error: 'Invalid keywordMasterId' }, { status: 400 });
      }
      const trend = await getKeywordTrend(keywordMasterId, websiteId, days);
      return NextResponse.json({ success: true, data: trend, mode: 'trend' });
    }

    // Default: latest rankings for all tracked keywords
    const rankings = await getLatestRankings(websiteId);
    return NextResponse.json({ success: true, data: rankings, mode: 'latest' });
  } catch (error) {
    console.error('[API] GET /seo/tracker/[websiteId]/keywords:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch keyword rankings' }, { status: 500 });
  }
}
