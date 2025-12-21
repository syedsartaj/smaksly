import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import { getPartnerSession } from '@/lib/partner-auth';

// GET - Browse available websites for guest posting
export async function GET(req: NextRequest) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const niche = searchParams.get('niche');
    const minDa = searchParams.get('minDa');
    const maxDa = searchParams.get('maxDa');
    const minDr = searchParams.get('minDr');
    const maxDr = searchParams.get('maxDr');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const language = searchParams.get('language');
    const sortBy = searchParams.get('sortBy') || 'da';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query - only active websites that accept guest posts
    const query: Record<string, unknown> = {
      status: 'active',
      acceptsGuestPosts: true,
    };

    // Search by name or domain
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by niche
    if (niche) {
      query.niche = niche;
    }

    // Filter by language
    if (language) {
      query.language = language;
    }

    // Filter by DA range
    if (minDa || maxDa) {
      query.da = {};
      if (minDa) (query.da as Record<string, number>).$gte = parseInt(minDa);
      if (maxDa) (query.da as Record<string, number>).$lte = parseInt(maxDa);
    }

    // Filter by DR range
    if (minDr || maxDr) {
      query.dr = {};
      if (minDr) (query.dr as Record<string, number>).$gte = parseInt(minDr);
      if (maxDr) (query.dr as Record<string, number>).$lte = parseInt(maxDr);
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.guestPostPrice = {};
      if (minPrice) (query.guestPostPrice as Record<string, number>).$gte = parseInt(minPrice) * 100; // cents
      if (maxPrice) (query.guestPostPrice as Record<string, number>).$lte = parseInt(maxPrice) * 100;
    }

    // Sort options
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [websites, total] = await Promise.all([
      Website.find(query)
        .select('name domain niche language da dr traffic guestPostPrice turnaroundDays contentGuidelines doFollow maxLinksPerPost')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Website.countDocuments(query),
    ]);

    // Transform data for marketplace display
    const marketplaceListings = websites.map((site) => ({
      id: site._id,
      name: site.name,
      domain: site.domain,
      niche: site.niche,
      language: site.language || 'English',
      metrics: {
        da: site.da,
        dr: site.dr,
        traffic: site.traffic,
      },
      pricing: {
        price: (site.guestPostPrice || 0) / 100, // Convert to dollars
        turnaround: site.turnaroundDays || 7,
      },
      guidelines: {
        contentGuidelines: site.contentGuidelines,
        linkType: site.doFollow ? 'dofollow' : 'nofollow',
        maxLinks: site.maxLinksPerPost || 2,
      },
    }));

    // Get unique niches for filtering
    const niches = await Website.distinct('niche', {
      status: 'active',
      acceptsGuestPosts: true,
    });

    return NextResponse.json({
      success: true,
      data: marketplaceListings,
      filters: {
        niches: niches.filter(Boolean).sort(),
        languages: ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Other'],
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching marketplace:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch marketplace listings' },
      { status: 500 }
    );
  }
}
