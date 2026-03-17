import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { connectDB } from '@/lib/db';
import { Website } from '@/models/Website';
import { PageCoverage } from '@/models/PageCoverage';
import { Content } from '@/models/Content';
import mongoose from 'mongoose';

function getGSCAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

// GET - Get coverage stats and URL list for a website
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');
    const coverageState = searchParams.get('coverageState');
    const verdict = searchParams.get('verdict');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    if (!websiteId) {
      // Return aggregate stats across all websites
      const allStats = await PageCoverage.aggregate([
        {
          $group: {
            _id: '$verdict',
            count: { $sum: 1 },
          },
        },
      ]);

      const coverageBreakdown = await PageCoverage.aggregate([
        {
          $group: {
            _id: '$coverageState',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const websiteStats = await PageCoverage.aggregate([
        {
          $group: {
            _id: '$websiteId',
            total: { $sum: 1 },
            indexed: { $sum: { $cond: [{ $eq: ['$verdict', 'PASS'] }, 1, 0] } },
            notIndexed: { $sum: { $cond: [{ $ne: ['$verdict', 'PASS'] }, 1, 0] } },
          },
        },
        { $sort: { notIndexed: -1 } },
        { $limit: 20 },
      ]);

      // Populate website names
      const websiteIds = websiteStats.map((s) => s._id);
      const websites = await Website.find({ _id: { $in: websiteIds } }, { name: 1, domain: 1 }).lean();
      const websiteMap = Object.fromEntries(websites.map((w) => [w._id.toString(), w]));

      const enrichedWebsiteStats = websiteStats.map((s) => ({
        ...s,
        websiteName: websiteMap[s._id?.toString()]?.name || 'Unknown',
        websiteDomain: websiteMap[s._id?.toString()]?.domain || '',
      }));

      const totalPages = await PageCoverage.countDocuments();
      const indexed = allStats.find((s) => s._id === 'PASS')?.count || 0;

      return NextResponse.json({
        success: true,
        data: {
          summary: { total: totalPages, indexed, notIndexed: totalPages - indexed },
          verdictBreakdown: Object.fromEntries(allStats.map((s) => [s._id, s.count])),
          coverageBreakdown,
          websiteStats: enrichedWebsiteStats,
          lastScanAt: await PageCoverage.findOne().sort({ lastInspectedAt: -1 }).select('lastInspectedAt').lean(),
        },
      });
    }

    // Per-website coverage
    const filter: Record<string, any> = {
      websiteId: new mongoose.Types.ObjectId(websiteId),
    };
    if (coverageState) filter.coverageState = coverageState;
    if (verdict) filter.verdict = verdict;
    if (search) filter.url = { $regex: search, $options: 'i' };

    const [urls, total, stats] = await Promise.all([
      PageCoverage.find(filter)
        .sort({ lastInspectedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PageCoverage.countDocuments(filter),
      PageCoverage.aggregate([
        { $match: { websiteId: new mongoose.Types.ObjectId(websiteId) } },
        {
          $facet: {
            byVerdict: [{ $group: { _id: '$verdict', count: { $sum: 1 } } }],
            byCoverage: [
              { $group: { _id: '$coverageState', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  indexed: { $sum: { $cond: [{ $eq: ['$verdict', 'PASS'] }, 1, 0] } },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const facets = stats[0] || { byVerdict: [], byCoverage: [], totals: [{ total: 0, indexed: 0 }] };
    const totals = facets.totals[0] || { total: 0, indexed: 0 };

    return NextResponse.json({
      success: true,
      data: {
        urls,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        summary: {
          total: totals.total,
          indexed: totals.indexed,
          notIndexed: totals.total - totals.indexed,
        },
        verdictBreakdown: Object.fromEntries(facets.byVerdict.map((v: any) => [v._id, v.count])),
        coverageBreakdown: facets.byCoverage,
      },
    });
  } catch (error: any) {
    console.error('Coverage API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper: fetch all pages Google knows about from Search Analytics
async function discoverAllGSCPages(
  searchconsole: any,
  siteUrl: string
): Promise<string[]> {
  const urls = new Set<string>();

  // 1. Get all pages from Search Analytics (last 16 months — max range)
  // These are pages that appeared in search results (indexed + got impressions)
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 16);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let startRow = 0;
    const rowLimit = 1000;
    let hasMore = true;

    while (hasMore) {
      const response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ['page'],
          rowLimit,
          startRow,
          dataState: 'all',
        },
      });

      const rows = response.data.rows || [];
      for (const row of rows) {
        if (row.keys?.[0]) urls.add(row.keys[0]);
      }

      hasMore = rows.length === rowLimit;
      startRow += rowLimit;

      // Safety: max 25K pages
      if (startRow > 25000) break;
    }
  } catch (e) {
    console.error('Error fetching search analytics pages:', e);
  }

  // 2. Try to fetch sitemap XML for additional URLs
  try {
    const sitemapsRes = await searchconsole.sitemaps.list({ siteUrl });
    const sitemaps = sitemapsRes.data.sitemap || [];

    for (const sitemap of sitemaps) {
      if (!sitemap.path) continue;
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10000);
        const xmlRes = await fetch(sitemap.path, { signal: controller.signal });
        if (xmlRes.ok) {
          const xml = await xmlRes.text();
          // Simple regex to extract URLs from sitemap XML
          const locMatches = xml.matchAll(/<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi);
          for (const match of locMatches) {
            urls.add(match[1]);
          }
        }
      } catch {
        // Sitemap fetch failed, skip
      }
    }
  } catch {
    // Sitemaps API failed, skip
  }

  return Array.from(urls);
}

// Helper: inspect a single URL and save to DB
async function inspectAndSave(
  searchconsole: any,
  siteUrl: string,
  websiteId: any,
  url: string
): Promise<any> {
  try {
    const response = await searchconsole.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl },
    });

    const result = response.data.inspectionResult;
    const indexStatus = result?.indexStatusResult;
    const mobileUsability = result?.mobileUsabilityResult;

    const inspectionData = {
      websiteId,
      url,
      verdict: (indexStatus?.verdict || 'UNKNOWN') as string,
      coverageState: indexStatus?.coverageState || 'Unknown',
      robotsTxtState: indexStatus?.robotsTxtState || 'Unknown',
      indexingState: indexStatus?.indexingState || 'Unknown',
      pageFetchState: indexStatus?.pageFetchState || 'Unknown',
      crawledAs: indexStatus?.crawledAs || 'Unknown',
      lastCrawlTime: indexStatus?.lastCrawlTime ? new Date(indexStatus.lastCrawlTime) : undefined,
      mobileUsability: mobileUsability?.verdict || 'UNKNOWN',
      referringUrls: (indexStatus?.referringUrls || []) as string[],
      lastInspectedAt: new Date(),
    };

    const existing = await PageCoverage.findOne({ websiteId, url });

    await PageCoverage.findOneAndUpdate(
      { websiteId, url },
      {
        ...inspectionData,
        previousVerdict: existing?.verdict,
        previousCoverageState: existing?.coverageState,
        $inc: { inspectionCount: 1 },
      },
      { upsert: true, new: true }
    );

    return { url, success: true, verdict: inspectionData.verdict, coverageState: inspectionData.coverageState };
  } catch (error: any) {
    return { url, success: false, error: error.message };
  }
}

// POST - Full coverage scan for a website
// Step 1: Discover all URLs from GSC Search Analytics + Sitemaps
// Step 2: Inspect up to 50 URLs per scan (prioritize uninspected/oldest)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { websiteId, urls: manualUrls } = body;

    if (!websiteId) {
      return NextResponse.json({ success: false, error: 'websiteId is required' }, { status: 400 });
    }

    const website = await Website.findById(websiteId);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const auth = getGSCAuth();
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const rawDomain = website.domain.replace(/^https?:\/\//, '');
    const siteUrl = `sc-domain:${rawDomain}`;

    let urlsToInspect: string[] = [];

    if (manualUrls && Array.isArray(manualUrls) && manualUrls.length > 0) {
      urlsToInspect = manualUrls.slice(0, 10);
    } else {
      // Step 1: Discover ALL URLs Google knows about
      const discoveredUrls = await discoverAllGSCPages(searchconsole, siteUrl);

      // Also add our known content URLs
      const domain = website.customDomain || website.domain;
      const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      const publishedContent = await Content.find(
        { websiteId: website._id, status: 'published' },
        { slug: 1 }
      ).lean();

      const contentUrls = [
        baseUrl,
        `${baseUrl}/blog`,
        ...publishedContent.map((c) => `${baseUrl}/blog/${c.slug}`),
      ];

      // Merge all discovered URLs
      const allUrls = [...new Set([...discoveredUrls, ...contentUrls])];

      // Step 2: Prioritize which to inspect (max 50 per scan)
      const existingCoverage = await PageCoverage.find(
        { websiteId: website._id },
        { url: 1, lastInspectedAt: 1 }
      ).lean();

      const inspectedMap = new Map(existingCoverage.map((c) => [c.url, c.lastInspectedAt]));

      // Split into uninspected and already-inspected
      const uninspected = allUrls.filter((u) => !inspectedMap.has(u));
      const alreadyInspected = allUrls
        .filter((u) => inspectedMap.has(u))
        .sort((a, b) => {
          const aTime = inspectedMap.get(a)?.getTime() || 0;
          const bTime = inspectedMap.get(b)?.getTime() || 0;
          return aTime - bTime; // Oldest first
        });

      // Uninspected first, then oldest — max 50
      urlsToInspect = [...uninspected, ...alreadyInspected].slice(0, 50);
    }

    if (urlsToInspect.length === 0) {
      return NextResponse.json({ success: true, data: { results: [], summary: { inspected: 0, indexed: 0, notIndexed: 0, errors: 0, totalDiscovered: 0 } } });
    }

    // Step 3: Inspect each URL
    const results: any[] = [];
    for (const url of urlsToInspect) {
      const result = await inspectAndSave(searchconsole, siteUrl, website._id, url);
      results.push(result);
      // Rate limit: 200ms between requests
      await new Promise((r) => setTimeout(r, 200));
    }

    const indexed = results.filter((r) => r.success && r.verdict === 'PASS').length;
    const notIndexed = results.filter((r) => r.success && r.verdict !== 'PASS' && r.verdict !== undefined).length;

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          inspected: results.length,
          indexed,
          notIndexed,
          errors: results.filter((r) => !r.success).length,
          totalDiscovered: urlsToInspect.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Coverage scan error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
