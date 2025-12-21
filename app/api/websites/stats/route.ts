import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';

// GET - Get website statistics for dashboard
export async function GET() {
  try {
    await connectDB();

    const [
      totalWebsites,
      activeWebsites,
      pendingWebsites,
      guestPostWebsites,
      totalTraffic,
      nicheDistribution,
      statusDistribution,
      topWebsites,
    ] = await Promise.all([
      // Total websites
      Website.countDocuments(),

      // Active websites
      Website.countDocuments({ status: 'active' }),

      // Pending websites
      Website.countDocuments({ status: 'pending' }),

      // Websites accepting guest posts
      Website.countDocuments({ acceptsGuestPosts: true, status: 'active' }),

      // Total traffic across network
      Website.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$traffic' } } },
      ]),

      // Distribution by niche
      Website.aggregate([
        { $group: { _id: '$niche', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Distribution by status
      Website.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Top 10 websites by traffic
      Website.find({ status: 'active' })
        .sort({ traffic: -1 })
        .limit(10)
        .select('name domain traffic da dr')
        .lean(),
    ]);

    // Average metrics
    const averageMetrics = await Website.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          avgDa: { $avg: '$da' },
          avgDr: { $avg: '$dr' },
          avgTraffic: { $avg: '$traffic' },
          avgPrice: { $avg: '$guestPostPrice' },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          websites: totalWebsites,
          active: activeWebsites,
          pending: pendingWebsites,
          guestPostEnabled: guestPostWebsites,
          totalTraffic: totalTraffic[0]?.total || 0,
        },
        averages: averageMetrics[0] || {
          avgDa: 0,
          avgDr: 0,
          avgTraffic: 0,
          avgPrice: 0,
        },
        distributions: {
          byNiche: nicheDistribution.map((item) => ({
            name: item._id || 'Unknown',
            count: item.count,
          })),
          byStatus: statusDistribution.map((item) => ({
            name: item._id || 'Unknown',
            count: item.count,
          })),
        },
        topWebsites,
      },
    });
  } catch (error) {
    console.error('Error fetching website stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch website statistics' },
      { status: 500 }
    );
  }
}
