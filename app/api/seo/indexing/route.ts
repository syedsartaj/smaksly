import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';

// Get auth client for indexing API
function getIndexingAuthClient() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
}

// GET - Get indexing status
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');

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

    // Get GSC auth for inspection API
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const rawDomain = website.domain.replace(/^https?:\/\//, '');
    const siteUrl = `sc-domain:${rawDomain}`;

    // Get sitemaps
    const sitemapsResponse = await searchconsole.sitemaps.list({
      siteUrl,
    });

    const sitemaps = (sitemapsResponse.data.sitemap || []).map((sitemap) => ({
      path: sitemap.path,
      lastSubmitted: sitemap.lastSubmitted,
      isPending: sitemap.isPending,
      warnings: sitemap.warnings,
      errors: sitemap.errors,
      contents: sitemap.contents,
    }));

    return NextResponse.json({
      success: true,
      data: {
        website: {
          id: website._id,
          name: website.name,
          domain: website.domain,
        },
        sitemaps,
      },
    });
  } catch (error) {
    console.error('Error fetching indexing status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indexing status' },
      { status: 500 }
    );
  }
}

// POST - Request indexing for URLs
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId, urls, type = 'URL_UPDATED' } = body;

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

    // Limit to 100 URLs per request
    if (urls.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 URLs per request' },
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

    const auth = getIndexingAuthClient();
    const indexing = google.indexing({ version: 'v3', auth });

    // Request indexing for each URL
    const results = await Promise.allSettled(
      urls.map(async (url: string) => {
        try {
          const response = await indexing.urlNotifications.publish({
            requestBody: {
              url,
              type, // URL_UPDATED or URL_DELETED
            },
          });
          return {
            url,
            success: true,
            data: response.data,
          };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            url,
            success: false,
            error: errorMessage,
          };
        }
      })
    );

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as { success: boolean }).success
    ).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      data: {
        submitted: successCount,
        failed: failCount,
        results: results.map((r) => {
          if (r.status === 'fulfilled') {
            return r.value;
          }
          return {
            success: false,
            error: r.reason?.message || 'Unknown error',
          };
        }),
      },
      message: `Submitted ${successCount} URLs for indexing`,
    });
  } catch (error) {
    console.error('Error requesting indexing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to request indexing' },
      { status: 500 }
    );
  }
}

// PUT - Submit sitemap
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId, sitemapUrl } = body;

    if (!websiteId || !sitemapUrl) {
      return NextResponse.json(
        { success: false, error: 'Website ID and sitemap URL are required' },
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
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const rawDomain = website.domain.replace(/^https?:\/\//, '');
    const siteUrl = `sc-domain:${rawDomain}`;

    await searchconsole.sitemaps.submit({
      siteUrl,
      feedpath: sitemapUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Sitemap submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting sitemap:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit sitemap' },
      { status: 500 }
    );
  }
}

// DELETE - Remove sitemap
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId, sitemapUrl } = body;

    if (!websiteId || !sitemapUrl) {
      return NextResponse.json(
        { success: false, error: 'Website ID and sitemap URL are required' },
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
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const rawDomain = website.domain.replace(/^https?:\/\//, '');
    const siteUrl = `sc-domain:${rawDomain}`;

    await searchconsole.sitemaps.delete({
      siteUrl,
      feedpath: sitemapUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Sitemap removed successfully',
    });
  } catch (error) {
    console.error('Error removing sitemap:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove sitemap' },
      { status: 500 }
    );
  }
}
