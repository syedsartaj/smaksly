import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Keyword } from '@/models';
import mongoose from 'mongoose';

// GET - Get keyword statistics
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');

    const match: Record<string, unknown> = {};
    if (websiteId) {
      match.websiteId = new mongoose.Types.ObjectId(websiteId);
    }

    const [
      totals,
      intentDistribution,
      difficultyDistribution,
      statusDistribution,
      topKeywords,
      recentKeywords,
    ] = await Promise.all([
      // Totals
      Keyword.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalKeywords: { $sum: 1 },
            totalVolume: { $sum: '$volume' },
            avgDifficulty: { $avg: '$difficulty' },
            avgCpc: { $avg: '$cpc' },
            clusteredCount: {
              $sum: { $cond: [{ $ifNull: ['$clusterId', false] }, 1, 0] },
            },
            assignedCount: {
              $sum: { $cond: [{ $ifNull: ['$websiteId', false] }, 1, 0] },
            },
          },
        },
      ]),

      // Intent distribution
      Keyword.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$intent',
            count: { $sum: 1 },
            totalVolume: { $sum: '$volume' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Difficulty distribution
      Keyword.aggregate([
        { $match: match },
        {
          $bucket: {
            groupBy: '$difficulty',
            boundaries: [0, 30, 60, 100],
            default: 'unknown',
            output: {
              count: { $sum: 1 },
              totalVolume: { $sum: '$volume' },
              avgCpc: { $avg: '$cpc' },
            },
          },
        },
      ]),

      // Status distribution
      Keyword.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Top keywords by volume
      Keyword.find(match)
        .sort({ volume: -1 })
        .limit(10)
        .select('keyword volume difficulty cpc intent')
        .lean(),

      // Recent keywords
      Keyword.find(match)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('keyword volume difficulty status createdAt')
        .lean(),
    ]);

    const stats = totals[0] || {
      totalKeywords: 0,
      totalVolume: 0,
      avgDifficulty: 0,
      avgCpc: 0,
      clusteredCount: 0,
      assignedCount: 0,
    };

    // Format difficulty distribution
    const difficultyLabels: Record<string, string> = {
      '0': 'Easy (0-30)',
      '30': 'Medium (30-60)',
      '60': 'Hard (60-100)',
    };

    const formattedDifficulty = difficultyDistribution.map((d) => ({
      label: difficultyLabels[String(d._id)] || 'Unknown',
      ...d,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          ...stats,
          avgCpc: stats.avgCpc / 100, // Convert from cents
        },
        intentDistribution,
        difficultyDistribution: formattedDifficulty,
        statusDistribution,
        topKeywords,
        recentKeywords,
      },
    });
  } catch (error) {
    console.error('Error fetching keyword stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch keyword statistics' },
      { status: 500 }
    );
  }
}
