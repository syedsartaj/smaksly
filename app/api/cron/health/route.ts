import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import { runFullHealthCheck } from '@/services/healthAnalyzer';
import { runIssueDetection } from '@/services/issueDetector';
import { autoFixAllForSite } from '@/services/aiFixService';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const websites = await Website.find({ status: 'active' }).lean();
    const results = [];

    for (const website of websites) {
      const siteId = website._id.toString();
      try {
        // Step 1: Run health check
        console.log(`[Cron/Health] Checking ${website.name}...`);
        const report = await runFullHealthCheck(siteId);

        // Step 2: Detect issues
        const detection = await runIssueDetection(siteId);

        // Step 3: Auto-fix fixable issues
        let fixResults = { fixed: 0, failed: 0, skipped: 0 };
        if (detection.stored.created > 0) {
          fixResults = await autoFixAllForSite(siteId);
        }

        results.push({
          websiteId: siteId,
          websiteName: website.name,
          seoScore: report.seoScore,
          summary: report.summary,
          issuesDetected: detection.detected,
          issuesCreated: detection.stored.created,
          fixes: fixResults,
        });

        console.log(`[Cron/Health] ${website.name}: score=${report.seoScore}, issues=${detection.detected}, fixed=${fixResults.fixed}`);
      } catch (error) {
        console.error(`[Cron/Health] Failed for ${website.name}:`, error);
        results.push({
          websiteId: siteId,
          websiteName: website.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sitesChecked: results.length,
      results,
    });
  } catch (error) {
    console.error('[Cron/Health] Failed:', error);
    return NextResponse.json(
      { error: 'Health cron failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
