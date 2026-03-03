import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AIFixReport, Website } from '@/models';
import { runAnalysis } from '@/services/websiteFixerService';
import { getQueue, QUEUE_NAMES } from '@/lib/queue';
import mongoose from 'mongoose';

// GET /api/seo/fixer
// Get latest fix reports for all websites (overview)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));

    if (websiteId && mongoose.isValidObjectId(websiteId)) {
      // Latest reports for a specific website
      const reports = await AIFixReport.find({
        websiteId: new mongoose.Types.ObjectId(websiteId),
      })
        .sort({ triggeredAt: -1 })
        .limit(limit)
        .lean();

      return NextResponse.json({ success: true, data: reports });
    }

    // Get latest report per website (for overview dashboard)
    const scoreFilter: Record<string, number> = {};
    if (minScore) scoreFilter.$gte = parseInt(minScore);
    if (maxScore) scoreFilter.$lte = parseInt(maxScore);

    const latestReports = await AIFixReport.aggregate([
      { $sort: { triggeredAt: -1 } },
      {
        $group: {
          _id: '$websiteId',
          latestReport: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latestReport' } },
      ...(Object.keys(scoreFilter).length
        ? [{ $match: { healthScore: scoreFilter } }]
        : []),
      { $sort: { healthScore: 1 } }, // worst first
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    // Populate website names
    const websiteIds = latestReports.map((r) => r.websiteId);
    const websites = await Website.find({ _id: { $in: websiteIds } })
      .select('name domain')
      .lean();

    const websiteMap = new Map(websites.map((w) => [w._id.toString(), w]));

    const enriched = latestReports.map((r) => ({
      ...r,
      website: websiteMap.get(r.websiteId.toString()),
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: { page, limit },
    });
  } catch (error) {
    console.error('[API] GET /seo/fixer:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fix reports' }, { status: 500 });
  }
}

// POST /api/seo/fixer
// Trigger AI analysis for one or all websites
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { websiteId, mode = 'single' } = body;

    if (mode === 'all') {
      // Queue a batch job to the correct WEBSITE_FIXER queue
      const fixerQueue = getQueue<{ websiteId: string; triggeredBy: string }>(QUEUE_NAMES.WEBSITE_FIXER);
      await fixerQueue.add('fixer-manual-all', { websiteId: 'all', triggeredBy: 'manual' });

      return NextResponse.json({
        success: true,
        message: 'AI fixer analysis queued for all websites',
      });
    }

    if (!websiteId || !mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Valid websiteId required' }, { status: 400 });
    }

    // Run immediately for a single website (manual trigger)
    const report = await runAnalysis(websiteId, 'manual');

    return NextResponse.json({
      success: true,
      data: report,
      message: `Analysis complete. Health score: ${report.healthScore}/100`,
    });
  } catch (error) {
    console.error('[API] POST /seo/fixer:', error);
    const message = error instanceof Error ? error.message : 'Failed to run analysis';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
