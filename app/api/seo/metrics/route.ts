import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { connectDB } from '@/lib/db';
import { Website, SEOMetric } from '@/models';

// Get auth client
function getAuthClient() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters',
    ],
  });
}

// GET - Fetch SEO metrics for a website
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');
    const domain = searchParams.get('domain');
    const period = searchParams.get('period') || '7d'; // 7d, 28d, 3m, 6m, 12m
    const dimension = searchParams.get('dimension') || 'date'; // date, query, page, country, device

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
    let startDate = new Date();

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
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '12m':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const auth = getAuthClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const rawDomain = website.domain.replace(/^https?:\/\//, '');
    const siteUrl = `sc-domain:${rawDomain}`;

    // Fetch data from GSC
    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: [dimension],
        dataState: 'all',
        rowLimit: dimension === 'date' ? 500 : 100,
      },
    });

    const rows = response.data.rows || [];

    // Format data based on dimension
    const data = rows.map((row) => ({
      key: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    // Calculate totals
    const totals = {
      clicks: rows.reduce((sum, r) => sum + (r.clicks || 0), 0),
      impressions: rows.reduce((sum, r) => sum + (r.impressions || 0), 0),
      ctr: rows.length > 0
        ? rows.reduce((sum, r) => sum + (r.ctr || 0), 0) / rows.length
        : 0,
      avgPosition: rows.length > 0
        ? rows.reduce((sum, r) => sum + (r.position || 0), 0) / rows.length
        : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        website: {
          id: website._id,
          name: website.name,
          domain: website.domain,
        },
        period,
        dimension,
        metrics: data,
        totals,
      },
    });
  } catch (error) {
    console.error('Error fetching SEO metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SEO metrics' },
      { status: 500 }
    );
  }
}

// POST - Store SEO metrics snapshot
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId } = body;

    if (!websiteId) {
      return NextResponse.json(
        { success: false, error: 'Website ID is required' },
        { status: 400 }
      );
    }

    const website = await Website.findById(websiteId);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    const auth = getAuthClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const rawDomain = website.domain.replace(/^https?:\/\//, '');
    const siteUrl = `sc-domain:${rawDomain}`;

    // Fetch last 28 days data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: ['date'],
        dataState: 'all',
      },
    });

    const rows = response.data.rows || [];

    // Calculate totals
    const totalClicks = rows.reduce((sum, r) => sum + (r.clicks || 0), 0);
    const totalImpressions = rows.reduce((sum, r) => sum + (r.impressions || 0), 0);
    const avgCtr = rows.length > 0
      ? rows.reduce((sum, r) => sum + (r.ctr || 0), 0) / rows.length
      : 0;
    const avgPosition = rows.length > 0
      ? rows.reduce((sum, r) => sum + (r.position || 0), 0) / rows.length
      : 0;

    // Get keywords count
    const keywordsResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: ['query'],
        dataState: 'all',
        rowLimit: 1000,
      },
    });

    const organicKeywords = keywordsResponse.data.rows?.length || 0;

    // Get pages count
    const pagesResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: ['page'],
        dataState: 'all',
        rowLimit: 1000,
      },
    });

    const indexedPages = pagesResponse.data.rows?.length || 0;

    // Create or update SEO metric record
    const metric = await SEOMetric.findOneAndUpdate(
      {
        websiteId,
        date: new Date().toISOString().slice(0, 10),
      },
      {
        websiteId,
        date: new Date(),
        gsc: {
          clicks: totalClicks,
          impressions: totalImpressions,
          ctr: avgCtr,
          position: avgPosition,
          indexedPages,
          organicKeywords,
        },
      },
      { upsert: true, new: true }
    );

    // Update website with latest metrics
    await Website.findByIdAndUpdate(websiteId, {
      traffic: totalClicks,
      organicKeywords,
      gscConnected: true,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: metric,
      message: 'SEO metrics stored successfully',
    });
  } catch (error) {
    console.error('Error storing SEO metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to store SEO metrics' },
      { status: 500 }
    );
  }
}
