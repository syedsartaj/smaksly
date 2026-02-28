import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES, addJob, type ContentGenerationJob } from '@/lib/queue';
import { generateAndSaveArticle } from '@/services/contentService';

async function processContentGeneration(job: Job<ContentGenerationJob>): Promise<unknown> {
  const { websiteId, keywordId, autoPublish } = job.data;
  console.log(`[ContentWorker] Generating content for keyword: ${keywordId}`);

  await job.updateProgress(10);
  const { contentId, markdown, article } = await generateAndSaveArticle(websiteId, keywordId);
  await job.updateProgress(80);

  console.log(`[ContentWorker] Article saved: ${article.title} (${article.wordCount} words)`);

  if (autoPublish) {
    await addJob.deploy({ websiteId, action: 'full' });
    console.log(`[ContentWorker] Auto-deploy queued for site: ${websiteId}`);
  }

  await job.updateProgress(100);
  return { contentId, title: article.title, wordCount: article.wordCount, slug: article.slug, autoPublish };
}

export function startContentWorker() {
  const worker = createWorker<ContentGenerationJob>(QUEUE_NAMES.CONTENT_GENERATION, processContentGeneration, 1);

  worker.on('completed', (job) => {
    console.log(`[ContentWorker] Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[ContentWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[ContentWorker] Started');
  return worker;
}
