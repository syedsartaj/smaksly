import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';

// Get auth client
function getAuthClient() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

// GET - Fetch keywords for a website from GSC
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');
    const domain = searchParams.get('domain');
    const period = searchParams.get('period') || '28d';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'clicks'; // clicks, impressions, ctr, position
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const filter = searchParams.get('filter') || ''; // keyword filter

    if (!websiteId && !domain) {
      return NextResponse.json(
        { success: false, error: 'Website ID or domain is required' },
        { status: 400 }
      );
    }

    // Get website
    let website;
    if (websiteId) {
      website = await Website.findById(websiteId);
    } else if (domain) {
      website = await Website.findOne({ domain });
    }

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '28d':
        startDate.setDate(startDate.getDate() - 28);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setDate(startDate.getDate() - 28);
    }

    const auth = getAuthClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const rawDomain = website.domain.replace(/^https?:\/\//, '');
    const siteUrl = `sc-domain:${rawDomain}`;

    // Fetch keywords from GSC
    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: ['query'],
        dataState: 'all',
        rowLimit: 1000, // Get all keywords then filter/paginate
      },
    });

    let keywords = (response.data.rows || []).map((row, index) => ({
      id: index + 1,
      keyword: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    // Apply keyword filter
    if (filter) {
      const filterLower = filter.toLowerCase();
      keywords = keywords.filter((k) =>
        k.keyword.toLowerCase().includes(filterLower)
      );
    }

    // Sort keywords
    keywords.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] as number;
      const bVal = b[sortBy as keyof typeof b] as number;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Pagination
    const total = keywords.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedKeywords = keywords.slice(offset, offset + limit);

    // Calculate stats
    const stats = {
      totalKeywords: total,
      avgPosition: keywords.length > 0
        ? keywords.reduce((sum, k) => sum + k.position, 0) / keywords.length
        : 0,
      top3Keywords: keywords.filter((k) => k.position <= 3).length,
      top10Keywords: keywords.filter((k) => k.position <= 10).length,
      top100Keywords: keywords.filter((k) => k.position <= 100).length,
    };

    return NextResponse.json({
      success: true,
      data: paginatedKeywords,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}
