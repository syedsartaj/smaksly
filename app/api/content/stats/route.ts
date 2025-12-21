import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content } from '@/models';
import mongoose from 'mongoose';

// GET - Get content statistics
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
      statusDistribution,
      typeDistribution,
      monthlyContent,
      recentContent,
      topContent,
    ] = await Promise.all([
      // Totals
      Content.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalContent: { $sum: 1 },
            totalWords: { $sum: '$wordCount' },
            avgWordCount: { $avg: '$wordCount' },
            publishedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
            },
            draftCount: {
              $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] },
            },
            scheduledCount: {
              $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] },
            },
            aiGeneratedCount: {
              $sum: { $cond: ['$aiGenerated', 1, 0] },
            },
          },
        },
      ]),

      // Status distribution
      Content.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Type distribution
      Content.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgWordCount: { $avg: '$wordCount' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Monthly content creation
      Content.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
            totalWords: { $sum: '$wordCount' },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),

      // Recent content
      Content.find(match)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title slug status type createdAt websiteId')
        .populate('websiteId', 'name domain')
        .lean(),

      // Top performing content (by engagement if available)
      Content.find({ ...match, status: 'published' })
        .sort({ 'engagement.views': -1 })
        .limit(10)
        .select('title slug engagement createdAt')
        .lean(),
    ]);

    const stats = totals[0] || {
      totalContent: 0,
      totalWords: 0,
      avgWordCount: 0,
      publishedCount: 0,
      draftCount: 0,
      scheduledCount: 0,
      aiGeneratedCount: 0,
    };

    // Format monthly data
    const formattedMonthly = monthlyContent.map((m) => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      count: m.count,
      totalWords: m.totalWords,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totals: stats,
        statusDistribution,
        typeDistribution,
        monthlyContent: formattedMonthly,
        recentContent,
        topContent,
      },
    });
  } catch (error) {
    console.error('Error fetching content stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content statistics' },
      { status: 500 }
    );
  }
}
