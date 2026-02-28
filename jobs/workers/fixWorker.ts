import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '@/lib/queue';
import { applyAutoFix, autoFixAllForSite } from '@/services/aiFixService';

interface AutoFixJob {
  type: 'single' | 'site';
  issueId?: string;
  websiteId?: string;
}

async function processFixJob(job: Job<AutoFixJob>): Promise<unknown> {
  const { type, issueId, websiteId } = job.data;
  console.log(`[FixWorker] Processing fix: type=${type}`);

  if (type === 'single' && issueId) {
    await job.updateProgress(20);
    const result = await applyAutoFix(issueId);
    await job.updateProgress(100);
    console.log(`[FixWorker] Single fix result: ${result.success ? 'success' : 'failed'} - ${result.message}`);
    return { type: 'single', issueId, result };
  }

  if (type === 'site' && websiteId) {
    await job.updateProgress(10);
    const result = await autoFixAllForSite(websiteId);
    await job.updateProgress(100);
    console.log(`[FixWorker] Site fix result: fixed=${result.fixed}, failed=${result.failed}`);
    return { type: 'site', websiteId, result };
  }

  return { type, error: 'Missing required parameters' };
}

export function startFixWorker() {
  const worker = createWorker<AutoFixJob>(QUEUE_NAMES.AUTO_FIX, processFixJob, 1);

  worker.on('completed', (job) => {
    console.log(`[FixWorker] Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[FixWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[FixWorker] Started');
  return worker;
}
