/**
 * keywordHistoryWorker.ts
 *
 * Daily keyword ranking history sync.
 * Runs at 6 AM UTC — pulls per-keyword GSC positions from stored
 * SEOMetric data and appends to KeywordHistory (never overwrites).
 *
 * Schedule: 0 6 * * *
 */

import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '@/lib/queue';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import { syncDailyRankingsFromGSC } from '@/services/keywordMasterService';

interface KeywordHistorySyncJob {
  websiteId?: string; // 'all' or specific ID
}

async function processKeywordHistorySync(job: Job<KeywordHistorySyncJob>): Promise<unknown> {
  const { websiteId } = job.data;
  await connectDB();

  await job.updateProgress(5);

  const results: { websiteId: string; name: string; processed: number; appended: number; skipped: number }[] = [];
  let errors = 0;

  if (websiteId && websiteId !== 'all') {
    // Single website
    const website = await Website.findById(websiteId).lean();
    const name = website?.name ?? websiteId;
    try {
      const r = await syncDailyRankingsFromGSC(websiteId);
      results.push({ websiteId, name, ...r });
      console.log(`[KeywordHistoryWorker] ${name}: processed=${r.processed}, appended=${r.appended}`);
    } catch (err) {
      console.error(`[KeywordHistoryWorker] Failed for ${name}:`, err);
      errors++;
    }
  } else {
    // All active websites
    const websites = await Website.find({ status: 'active', gscConnected: true })
      .select('_id name')
      .lean();

    const total = websites.length;
    let done = 0;

    for (const site of websites) {
      try {
        const r = await syncDailyRankingsFromGSC(site._id.toString());
        results.push({ websiteId: site._id.toString(), name: site.name, ...r });
        console.log(`[KeywordHistoryWorker] ${site.name}: processed=${r.processed}, appended=${r.appended}`);
      } catch (err) {
        console.error(`[KeywordHistoryWorker] Failed for ${site.name}:`, err);
        errors++;
      }

      done++;
      await job.updateProgress(Math.round((done / total) * 100));
    }
  }

  await job.updateProgress(100);

  const totalAppended = results.reduce((s, r) => s + r.appended, 0);
  console.log(`[KeywordHistoryWorker] Done. appended=${totalAppended}, errors=${errors}`);

  return { sites: results.length, totalAppended, errors };
}

export function startKeywordHistoryWorker() {
  const worker = createWorker<KeywordHistorySyncJob>(
    QUEUE_NAMES.KEYWORD_HISTORY_SYNC,
    processKeywordHistorySync,
    1 // serial — avoid GSC rate limits
  );

  worker.on('completed', (job) => {
    console.log(`[KeywordHistoryWorker] Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[KeywordHistoryWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[KeywordHistoryWorker] Started (daily 06:00 UTC)');
  return worker;
}
