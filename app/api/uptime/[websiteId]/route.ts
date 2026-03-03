import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UptimeLog } from '@/models';
import mongoose from 'mongoose';

// GET /api/uptime/[websiteId]
// Uptime stats and logs for a website
// Params: days (default 30), page, limit, mode (stats|logs|hourly)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    await connectDB();
    const { websiteId } = await params;
    const { searchParams } = new URL(req.url);
    const days = Math.min(90, parseInt(searchParams.get('days') ?? '30'));
    const mode = searchParams.get('mode') ?? 'stats';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '100'));

    if (!mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid websiteId' }, { status: 400 });
    }

    const wid = new mongoose.Types.ObjectId(websiteId);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    if (mode === 'stats') {
      // Aggregate uptime stats
      const agg = await UptimeLog.aggregate([
        { $match: { websiteId: wid, checkedAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            upCount: { $sum: { $cond: ['$isUp', 1, 0] } },
            downCount: { $sum: { $cond: [{ $eq: ['$isUp', false] }, 1, 0] } },
            avgLatency: { $avg: '$latencyMs' },
            minLatency: { $min: '$latencyMs' },
            maxLatency: { $max: '$latencyMs' },
            lastChecked: { $max: '$checkedAt' },
            lastStatus: { $last: '$status' },
            lastStatusCode: { $last: '$statusCode' },
          },
        },
      ]);

      const stats = agg[0] ?? { total: 0, upCount: 0, downCount: 0 };
      const uptimePercent =
        stats.total > 0 ? Math.round((stats.upCount / stats.total) * 10000) / 100 : 100;

      // Downtime incidents in the period
      const downIncidents = await UptimeLog.find({
        websiteId: wid,
        isUp: false,
        checkedAt: { $gte: since },
      })
        .sort({ checkedAt: -1 })
        .limit(10)
        .select('statusCode status errorMessage checkedAt latencyMs')
        .lean();

      return NextResponse.json({
        success: true,
        data: {
          uptimePercent,
          totalChecks: stats.total,
          upChecks: stats.upCount,
          downChecks: stats.downCount,
          avgLatencyMs: stats.avgLatency ? Math.round(stats.avgLatency) : null,
          minLatencyMs: stats.minLatency,
          maxLatencyMs: stats.maxLatency,
          lastChecked: stats.lastChecked,
          currentStatus: stats.lastStatus ?? 'unknown',
          currentStatusCode: stats.lastStatusCode,
          recentDowntime: downIncidents,
          period: `last_${days}_days`,
        },
      });
    }

    if (mode === 'hourly') {
      // Hourly uptime % for chart
      const hourly = await UptimeLog.aggregate([
        { $match: { websiteId: wid, checkedAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year: { $year: '$checkedAt' },
              month: { $month: '$checkedAt' },
              day: { $dayOfMonth: '$checkedAt' },
              hour: { $hour: '$checkedAt' },
            },
            total: { $sum: 1 },
            upCount: { $sum: { $cond: ['$isUp', 1, 0] } },
            avgLatency: { $avg: '$latencyMs' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
        {
          $project: {
            _id: 0,
            hour: {
              $dateFromParts: {
                year: '$_id.year', month: '$_id.month',
                day: '$_id.day', hour: '$_id.hour',
              },
            },
            uptimePercent: {
              $round: [{ $multiply: [{ $divide: ['$upCount', '$total'] }, 100] }, 1],
            },
            avgLatency: { $round: ['$avgLatency', 0] },
            checks: '$total',
          },
        },
      ]);

      return NextResponse.json({ success: true, data: hourly, mode: 'hourly' });
    }

    // mode === 'logs' — raw paginated logs
    const [total, logs] = await Promise.all([
      UptimeLog.countDocuments({ websiteId: wid, checkedAt: { $gte: since } }),
      UptimeLog.find({ websiteId: wid, checkedAt: { $gte: since } })
        .sort({ checkedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('statusCode latencyMs isUp status errorMessage checkedAt url')
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[API] GET /uptime/[websiteId]:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch uptime data' }, { status: 500 });
  }
}
