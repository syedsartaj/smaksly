import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES, type KeywordResearchJob } from '@/lib/queue';
import { fetchKeywordIdeas, filterByDifficulty, storeKeywords, enrichWithSERP, runDailyKeywordResearch } from '@/services/keywordService';

async function processKeywordResearch(job: Job<KeywordResearchJob>): Promise<unknown> {
  const { websiteId, categoryId, seedKeywords } = job.data;
  console.log(`[KeywordWorker] Processing keyword research for site: ${websiteId}`);

  if (websiteId === 'all') {
    const results = await runDailyKeywordResearch();
    return { type: 'daily', results };
  }

  const raw = await fetchKeywordIdeas(websiteId, seedKeywords);
  const filtered = filterByDifficulty(raw, { maxDifficulty: 40, minVolume: 100 });
  const stored = await storeKeywords(websiteId, categoryId, filtered);

  await job.updateProgress(80);
  const enriched = await enrichWithSERP(websiteId, 10);
  await job.updateProgress(100);

  console.log(`[KeywordWorker] Done: fetched=${raw.length}, filtered=${filtered.length}, stored=${stored.inserted}, enriched=${enriched}`);
  return { fetched: raw.length, filtered: filtered.length, stored, enriched };
}

export function startKeywordWorker() {
  const worker = createWorker<KeywordResearchJob>(QUEUE_NAMES.KEYWORD_RESEARCH, processKeywordResearch, 2);

  worker.on('completed', (job) => {
    console.log(`[KeywordWorker] Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[KeywordWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[KeywordWorker] Started');
  return worker;
}
