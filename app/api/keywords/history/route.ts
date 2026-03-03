import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { KeywordHistory, KeywordMaster } from '@/models';
import { getKeywordTrend, getLatestRankings } from '@/services/keywordMasterService';
import mongoose from 'mongoose';

// GET /api/keywords/history
// Query keyword ranking history
// Params: websiteId (required), keywordMasterId, keyword, days (default 30), page, limit
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');
    const keywordMasterId = searchParams.get('keywordMasterId');
    const keyword = searchParams.get('keyword');
    const days = Math.min(365, parseInt(searchParams.get('days') ?? '30'));
    const mode = searchParams.get('mode') ?? 'list'; // list | trend | latest
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '50'));

    if (!websiteId || !mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Valid websiteId required' }, { status: 400 });
    }

    // Mode: latest — get latest ranking snapshot for all keywords on this website
    if (mode === 'latest') {
      const rankings = await getLatestRankings(websiteId);
      return NextResponse.json({ success: true, data: rankings, mode: 'latest' });
    }

    // Mode: trend — get time-series for a specific keyword
    if (mode === 'trend') {
      let masterId = keywordMasterId;

      // Resolve keyword string to master ID if needed
      if (!masterId && keyword) {
        const master = await KeywordMaster.findOne({
          keyword: keyword.toLowerCase(),
        }).lean();
        if (!master) {
          return NextResponse.json({ success: false, error: 'Keyword not found in master' }, { status: 404 });
        }
        masterId = master._id.toString();
      }

      if (!masterId || !mongoose.isValidObjectId(masterId)) {
        return NextResponse.json(
          { success: false, error: 'keywordMasterId or keyword required for trend mode' },
          { status: 400 }
        );
      }

      const trend = await getKeywordTrend(masterId, websiteId, days);
      return NextResponse.json({ success: true, data: trend, mode: 'trend', days });
    }

    // Mode: list — paginated history for a website
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const filter: Record<string, unknown> = {
      websiteId: new mongoose.Types.ObjectId(websiteId),
      date: { $gte: since },
    };
    if (keywordMasterId && mongoose.isValidObjectId(keywordMasterId)) {
      filter.keywordMasterId = new mongoose.Types.ObjectId(keywordMasterId);
    }
    if (keyword) filter.keyword = { $regex: new RegExp(keyword, 'i') };

    const [total, history] = await Promise.all([
      KeywordHistory.countDocuments(filter),
      KeywordHistory.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: history,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      mode: 'list',
    });
  } catch (error) {
    console.error('[API] GET /keywords/history:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}
