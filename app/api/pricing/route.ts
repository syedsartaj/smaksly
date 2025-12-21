import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import mongoose from 'mongoose';

// GET - Get pricing configuration for websites
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const niche = searchParams.get('niche');
    const minDa = searchParams.get('minDa');
    const maxDa = searchParams.get('maxDa');
    const acceptsGuestPosts = searchParams.get('acceptsGuestPosts');

    const query: Record<string, unknown> = {};

    if (niche) {
      query.niche = niche;
    }

    if (minDa || maxDa) {
      query.da = {};
      if (minDa) (query.da as Record<string, number>).$gte = parseInt(minDa);
      if (maxDa) (query.da as Record<string, number>).$lte = parseInt(maxDa);
    }

    if (acceptsGuestPosts !== null) {
      query.acceptsGuestPosts = acceptsGuestPosts === 'true';
    }

    const skip = (page - 1) * limit;

    const [websites, total, niches, priceStats] = await Promise.all([
      Website.find(query)
        .select('name domain niche da dr traffic acceptsGuestPosts guestPostPrice turnaroundDays doFollow status')
        .sort({ da: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Website.countDocuments(query),
      Website.distinct('niche'),
      Website.aggregate([
        { $match: { acceptsGuestPosts: true, guestPostPrice: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$guestPostPrice' },
            minPrice: { $min: '$guestPostPrice' },
            maxPrice: { $max: '$guestPostPrice' },
            totalWebsites: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = priceStats[0] || {
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      totalWebsites: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        websites: websites.map((w) => ({
          id: w._id,
          name: w.name,
          domain: w.domain,
          niche: w.niche,
          metrics: {
            da: w.da,
            dr: w.dr,
            traffic: w.traffic,
          },
          pricing: {
            acceptsGuestPosts: w.acceptsGuestPosts,
            price: (w.guestPostPrice || 0) / 100,
            turnaround: w.turnaroundDays || 7,
            linkType: w.doFollow ? 'dofollow' : 'nofollow',
          },
          status: w.status,
        })),
        stats: {
          avgPrice: stats.avgPrice / 100,
          minPrice: stats.minPrice / 100,
          maxPrice: stats.maxPrice / 100,
          totalWebsites: stats.totalWebsites,
        },
        niches: niches.filter(Boolean).sort(),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}

// POST - Bulk update pricing
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { action, websiteIds, price, turnaround, linkType, acceptsGuestPosts } = body;

    if (!action || !['update', 'adjust'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid action is required (update or adjust)' },
        { status: 400 }
      );
    }

    if (!websiteIds || !Array.isArray(websiteIds) || websiteIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Website IDs are required' },
        { status: 400 }
      );
    }

    const objectIds = websiteIds.map((id: string) => new mongoose.Types.ObjectId(id));
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (action === 'update') {
      // Direct value update
      if (price !== undefined) {
        updateData.guestPostPrice = Math.round(price * 100); // Convert to cents
      }
      if (turnaround !== undefined) {
        updateData.turnaroundDays = turnaround;
      }
      if (linkType !== undefined) {
        updateData.doFollow = linkType === 'dofollow';
      }
      if (acceptsGuestPosts !== undefined) {
        updateData.acceptsGuestPosts = acceptsGuestPosts;
      }

      await Website.updateMany(
        { _id: { $in: objectIds } },
        { $set: updateData }
      );
    } else if (action === 'adjust') {
      // Percentage-based adjustment
      const { adjustmentPercent, adjustmentType } = body;

      if (!adjustmentPercent || !adjustmentType || !['increase', 'decrease'].includes(adjustmentType)) {
        return NextResponse.json(
          { success: false, error: 'Adjustment percent and type required for adjust action' },
          { status: 400 }
        );
      }

      const multiplier = adjustmentType === 'increase'
        ? 1 + (adjustmentPercent / 100)
        : 1 - (adjustmentPercent / 100);

      await Website.updateMany(
        { _id: { $in: objectIds } },
        [
          {
            $set: {
              guestPostPrice: {
                $round: [{ $multiply: ['$guestPostPrice', multiplier] }, 0],
              },
              updatedAt: new Date(),
            },
          },
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Pricing updated for ${websiteIds.length} websites`,
    });
  } catch (error) {
    console.error('Error updating pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pricing' },
      { status: 500 }
    );
  }
}
