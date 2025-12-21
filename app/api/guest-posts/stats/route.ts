import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GuestPost } from '@/models';
import mongoose from 'mongoose';

// GET - Get guest post statistics
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');

    const match: Record<string, unknown> = {};
    if (websiteId) {
      match.websiteId = new mongoose.Types.ObjectId(websiteId);
    }

    // Calculate expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      statusCounts,
      totals,
      expiringSoon,
      recentSubmissions,
      monthlyStats,
    ] = await Promise.all([
      // Status distribution
      GuestPost.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Overall totals
      GuestPost.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalRevenue: { $sum: '$price' },
            publishedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
            },
            pendingCount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      ['content_pending', 'content_submitted', 'under_review', 'revision_requested'],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            avgPrice: { $avg: '$price' },
          },
        },
      ]),

      // Expiring soon count
      GuestPost.countDocuments({
        ...match,
        status: 'published',
        hasExpiry: true,
        expiresAt: {
          $gte: new Date(),
          $lte: thirtyDaysFromNow,
        },
      }),

      // Recent submissions
      GuestPost.find({ ...match, status: { $in: ['content_submitted', 'under_review'] } })
        .sort({ contentSubmittedAt: -1 })
        .limit(10)
        .populate('websiteId', 'name domain')
        .populate('partnerId', 'companyName')
        .select('title status contentSubmittedAt websiteId partnerId')
        .lean(),

      // Monthly stats
      GuestPost.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
            revenue: { $sum: '$price' },
            published: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
            },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
    ]);

    const stats = totals[0] || {
      totalPosts: 0,
      totalRevenue: 0,
      publishedCount: 0,
      pendingCount: 0,
      avgPrice: 0,
    };

    // Format status counts
    const statusMap: Record<string, { count: number; revenue: number }> = {};
    statusCounts.forEach((s) => {
      statusMap[s._id] = { count: s.count, revenue: s.totalRevenue };
    });

    // Format monthly stats
    const formattedMonthly = monthlyStats.map((m) => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      count: m.count,
      revenue: m.revenue,
      published: m.published,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          ...stats,
          totalRevenue: stats.totalRevenue / 100, // Convert from cents
          avgPrice: stats.avgPrice / 100,
          expiringSoon,
        },
        statusDistribution: statusMap,
        recentSubmissions,
        monthlyStats: formattedMonthly,
      },
    });
  } catch (error) {
    console.error('Error fetching guest post stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guest post statistics' },
      { status: 500 }
    );
  }
}
