import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES, addJob } from '@/lib/queue';
import { runFullHealthCheck } from '@/services/healthAnalyzer';
import { runIssueDetection } from '@/services/issueDetector';

interface HealthCheckJob {
  websiteId: string;
  runAutoFix?: boolean;
}

async function processHealthCheck(job: Job<HealthCheckJob>): Promise<unknown> {
  const { websiteId, runAutoFix = false } = job.data;
  console.log(`[HealthWorker] Running health check for site: ${websiteId}`);

  await job.updateProgress(10);
  const report = await runFullHealthCheck(websiteId);
  await job.updateProgress(50);

  console.log(`[HealthWorker] SEO Score: ${report.seoScore}, Issues: ${report.summary.totalIssues}`);

  const detection = await runIssueDetection(websiteId);
  await job.updateProgress(80);

  if (runAutoFix && detection.stored.created > 0) {
    await addJob.autoFix({ type: 'site', websiteId });
    console.log(`[HealthWorker] Auto-fix queued for site: ${websiteId}`);
  }

  await job.updateProgress(100);
  return {
    seoScore: report.seoScore,
    summary: report.summary,
    issuesDetected: detection.detected,
    issuesCreated: detection.stored.created,
    autoFixQueued: runAutoFix && detection.stored.created > 0,
  };
}

export function startHealthWorker() {
  const worker = createWorker<HealthCheckJob>(QUEUE_NAMES.HEALTH_CHECK, processHealthCheck, 2);

  worker.on('completed', (job) => {
    console.log(`[HealthWorker] Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[HealthWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[HealthWorker] Started');
  return worker;
}
