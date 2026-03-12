import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';

// POST - Inspect URL indexing status via GSC URL Inspection API
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId, urls } = body;

    if (!websiteId) {
      return NextResponse.json(
        { success: false, error: 'Website ID is required' },
        { status: 400 }
      );
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'URLs array is required' },
        { status: 400 }
      );
    }

    // Limit to 10 URLs per request (API rate limit is 2000/day)
    if (urls.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 URLs per inspection request' },
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

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const rawDomain = website.domain.replace(/^https?:\/\//, '');
    const siteUrl = `sc-domain:${rawDomain}`;

    // Inspect each URL sequentially (rate limit friendly)
    const results = [];
    for (const url of urls) {
      try {
        const response = await searchconsole.urlInspection.index.inspect({
          requestBody: {
            inspectionUrl: url,
            siteUrl,
          },
        });

        const result = response.data.inspectionResult;
        const indexStatus = result?.indexStatusResult;
        const mobileUsability = result?.mobileUsabilityResult;

        results.push({
          url,
          success: true,
          verdict: indexStatus?.verdict || 'UNKNOWN',
          coverageState: indexStatus?.coverageState || 'Unknown',
          robotsTxtState: indexStatus?.robotsTxtState || 'Unknown',
          indexingState: indexStatus?.indexingState || 'Unknown',
          lastCrawlTime: indexStatus?.lastCrawlTime || null,
          pageFetchState: indexStatus?.pageFetchState || 'Unknown',
          crawledAs: indexStatus?.crawledAs || 'Unknown',
          mobileUsability: mobileUsability?.verdict || 'UNKNOWN',
          referringUrls: indexStatus?.referringUrls || [],
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Inspection failed';
        results.push({
          url,
          success: false,
          verdict: 'ERROR',
          error: errorMessage,
        });
      }
    }

    const indexed = results.filter(r => r.success && r.verdict === 'PASS').length;
    const notIndexed = results.filter(r => r.success && r.verdict !== 'PASS').length;
    const errors = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: { indexed, notIndexed, errors, total: results.length },
      },
    });
  } catch (error) {
    console.error('Error inspecting URLs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to inspect URLs' },
      { status: 500 }
    );
  }
}
