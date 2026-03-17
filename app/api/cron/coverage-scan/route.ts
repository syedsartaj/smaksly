import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { connectDB } from '@/lib/db';
import { Website } from '@/models/Website';
import { Content } from '@/models/Content';
import { PageCoverage } from '@/models/PageCoverage';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Cron: auto-scan URLs for indexing coverage
// Run every 6 hours. Respects 2000/day API limit by scanning ~500 URLs per run.
// Prioritizes: new content first, then oldest-inspected URLs.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    // Get active websites with GSC connected
    const websites = await Website.find(
      { status: 'active', gscConnected: true },
      { _id: 1, domain: 1, customDomain: 1 }
    ).lean();

    if (websites.length === 0) {
      return NextResponse.json({ success: true, message: 'No GSC-connected websites', scanned: 0 });
    }

    let totalScanned = 0;
    let totalIndexed = 0;
    let totalErrors = 0;
    const maxPerRun = 500; // Stay well within 2000/day limit (4 runs/day = 2000)

    for (const website of websites) {
      if (totalScanned >= maxPerRun) break;

      const domain = website.customDomain || website.domain;
      const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      const rawDomain = website.domain.replace(/^https?:\/\//, '');
      const siteUrl = `sc-domain:${rawDomain}`;

      // Get published content URLs
      const publishedContent = await Content.find(
        { websiteId: website._id, status: 'published' },
        { slug: 1 }
      ).lean();

      const allUrls = [
        baseUrl,
        `${baseUrl}/blog`,
        ...publishedContent.map((c) => `${baseUrl}/blog/${c.slug}`),
      ];

      // Find URLs not yet inspected or inspected > 7 days ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const existingCoverage = await PageCoverage.find(
        { websiteId: website._id, url: { $in: allUrls } },
        { url: 1, lastInspectedAt: 1 }
      ).lean();

      const inspectedMap = new Map(existingCoverage.map((c) => [c.url, c.lastInspectedAt]));
      const needsInspection = allUrls.filter((url) => {
        const lastInspected = inspectedMap.get(url);
        return !lastInspected || new Date(lastInspected) < sevenDaysAgo;
      });

      // Limit per website
      const batchSize = Math.min(needsInspection.length, maxPerRun - totalScanned, 20);
      const batch = needsInspection.slice(0, batchSize);

      for (const url of batch) {
        try {
          const response = await searchconsole.urlInspection.index.inspect({
            requestBody: { inspectionUrl: url, siteUrl },
          });

          const result = response.data.inspectionResult;
          const indexStatus = result?.indexStatusResult;
          const mobileUsability = result?.mobileUsabilityResult;

          const existing = await PageCoverage.findOne({ websiteId: website._id, url });

          await PageCoverage.findOneAndUpdate(
            { websiteId: website._id, url },
            {
              verdict: indexStatus?.verdict || 'UNKNOWN',
              coverageState: indexStatus?.coverageState || 'Unknown',
              robotsTxtState: indexStatus?.robotsTxtState || 'Unknown',
              indexingState: indexStatus?.indexingState || 'Unknown',
              pageFetchState: indexStatus?.pageFetchState || 'Unknown',
              crawledAs: indexStatus?.crawledAs || 'Unknown',
              lastCrawlTime: indexStatus?.lastCrawlTime ? new Date(indexStatus.lastCrawlTime) : undefined,
              mobileUsability: mobileUsability?.verdict || 'UNKNOWN',
              referringUrls: indexStatus?.referringUrls || [],
              lastInspectedAt: new Date(),
              previousVerdict: existing?.verdict,
              previousCoverageState: existing?.coverageState,
              $inc: { inspectionCount: 1 },
            },
            { upsert: true }
          );

          if (indexStatus?.verdict === 'PASS') totalIndexed++;
          totalScanned++;
        } catch {
          totalErrors++;
          totalScanned++;
        }

        // Rate limit: 200ms between requests
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return NextResponse.json({
      success: true,
      scanned: totalScanned,
      indexed: totalIndexed,
      errors: totalErrors,
      websites: websites.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Coverage scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
