/**
 * websiteFixerWorker.ts
 *
 * Weekly AI website fixer analysis.
 * Runs at 4 AM UTC on Mondays — calls gpt-4o once per website
 * with aggregated 30-day stats and stores a structured AIFixReport.
 *
 * Schedule: 0 4 * * 1  (Mondays)
 *
 * Cost control: Redis cache prevents re-running within 7 days.
 */

import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '@/lib/queue';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import { runAnalysis } from '@/services/websiteFixerService';

interface WebsiteFixerJob {
  websiteId?: string; // 'all' or specific ID
  triggeredBy?: 'cron' | 'manual' | 'webhook';
  bypassCache?: boolean;
}

async function processWebsiteFixer(job: Job<WebsiteFixerJob>): Promise<unknown> {
  const { websiteId, triggeredBy = 'cron', bypassCache = false } = job.data;
  await connectDB();

  await job.updateProgress(5);

  const results: { websiteId: string; name: string; healthScore: number }[] = [];
  let errors = 0;

  if (websiteId && websiteId !== 'all') {
    // Single website
    const website = await Website.findById(websiteId).lean();
    const name = website?.name ?? websiteId;
    try {
      const report = await runAnalysis(websiteId, triggeredBy);
      results.push({ websiteId, name, healthScore: report.healthScore });
      console.log(`[WebsiteFixerWorker] ${name}: healthScore=${report.healthScore}`);
    } catch (err) {
      console.error(`[WebsiteFixerWorker] Failed for ${name}:`, err);
      errors++;
    }
  } else {
    // All active websites
    const websites = await Website.find({ status: 'active' })
      .select('_id name')
      .lean();

    const total = websites.length;
    let done = 0;

    for (const site of websites) {
      try {
        const report = await runAnalysis(
          site._id.toString(),
          bypassCache ? 'manual' : 'cron'
        );
        results.push({
          websiteId: site._id.toString(),
          name: site.name,
          healthScore: report.healthScore,
        });
        console.log(`[WebsiteFixerWorker] ${site.name}: healthScore=${report.healthScore}`);
      } catch (err) {
        console.error(`[WebsiteFixerWorker] Failed for ${site.name}:`, err);
        errors++;
      }

      done++;
      await job.updateProgress(Math.round((done / total) * 95));
    }
  }

  await job.updateProgress(100);
  console.log(`[WebsiteFixerWorker] Done. processed=${results.length}, errors=${errors}`);

  return { sites: results.length, errors, results };
}

export function startWebsiteFixerWorker() {
  const worker = createWorker<WebsiteFixerJob>(
    QUEUE_NAMES.WEBSITE_FIXER,
    processWebsiteFixer,
    1 // serial — gpt-4o rate limits
  );

  worker.on('completed', (job) => {
    console.log(`[WebsiteFixerWorker] Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[WebsiteFixerWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[WebsiteFixerWorker] Started (weekly Mon 04:00 UTC)');
  return worker;
}
