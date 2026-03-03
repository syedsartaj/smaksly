import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SEOMetric } from '@/models';
import mongoose from 'mongoose';

// GET /api/seo/tracker/[websiteId]/trends
// Trend chart data: clicks, impressions, CTR, avg position over time
// Params: days (7|14|30|60|90), metric (clicks|impressions|ctr|position|all)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    await connectDB();
    const { websiteId } = await params;
    const { searchParams } = new URL(req.url);
    const days = Math.min(365, parseInt(searchParams.get('days') ?? '30'));
    const metric = searchParams.get('metric') ?? 'all';
    const comparePeriod = searchParams.get('compare') === 'true';

    if (!mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid websiteId' }, { status: 400 });
    }

    const wid = new mongoose.Types.ObjectId(websiteId);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const data = await SEOMetric.find(
      { websiteId: wid, period: 'daily', date: { $gte: since } }
    )
      .select('date gsc.clicks gsc.impressions gsc.ctr gsc.position gsc.indexedPages coreWebVitals.lcp coreWebVitals.cls coreWebVitals.status')
      .sort({ date: 1 })
      .lean();

    // Shape for chart consumption
    const trend = data.map((d) => ({
      date: d.date,
      clicks: d.gsc.clicks,
      impressions: d.gsc.impressions,
      ctr: Math.round(d.gsc.ctr * 100) / 100,
      position: Math.round(d.gsc.position * 10) / 10,
      indexedPages: d.gsc.indexedPages,
      lcp: d.coreWebVitals.lcp,
      cls: d.coreWebVitals.cls,
      webVitalsStatus: d.coreWebVitals.status,
    }));

    // Summary stats for the period
    const totalClicks = trend.reduce((s, d) => s + d.clicks, 0);
    const totalImpressions = trend.reduce((s, d) => s + d.impressions, 0);
    const avgPosition =
      trend.length ? trend.reduce((s, d) => s + d.position, 0) / trend.length : 0;
    const avgCTR =
      trend.length ? trend.reduce((s, d) => s + d.ctr, 0) / trend.length : 0;

    let comparison = null;

    if (comparePeriod) {
      // Previous period for comparison
      const prevSince = new Date(since);
      prevSince.setUTCDate(prevSince.getUTCDate() - days);
      const prevData = await SEOMetric.find(
        { websiteId: wid, period: 'daily', date: { $gte: prevSince, $lt: since } },
        { 'gsc.clicks': 1, 'gsc.impressions': 1, 'gsc.position': 1, 'gsc.ctr': 1 }
      ).lean();

      const prevClicks = prevData.reduce((s, d) => s + d.gsc.clicks, 0);
      const prevImpressions = prevData.reduce((s, d) => s + d.gsc.impressions, 0);
      const prevPosition =
        prevData.length ? prevData.reduce((s, d) => s + d.gsc.position, 0) / prevData.length : 0;

      comparison = {
        clicks: prevClicks,
        impressions: prevImpressions,
        avgPosition: Math.round(prevPosition * 10) / 10,
        clicksDelta: prevClicks > 0
          ? Math.round(((totalClicks - prevClicks) / prevClicks) * 100)
          : null,
        impressionsDelta: prevImpressions > 0
          ? Math.round(((totalImpressions - prevImpressions) / prevImpressions) * 100)
          : null,
        positionDelta: prevPosition > 0
          ? Math.round((prevPosition - avgPosition) * 10) / 10 // negative = dropped
          : null,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        trend,
        summary: {
          totalClicks,
          totalImpressions,
          avgPosition: Math.round(avgPosition * 10) / 10,
          avgCTR: Math.round(avgCTR * 100) / 100,
          days,
          dataPoints: trend.length,
        },
        comparison,
      },
    });
  } catch (error) {
    console.error('[API] GET /seo/tracker/[websiteId]/trends:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trend data' }, { status: 500 });
  }
}
