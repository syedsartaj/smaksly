import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES, addJob } from '@/lib/queue';
import { deployArticle, triggerVercelDeploy } from '@/services/deployService';
import { connectDB } from '@/lib/db';
import { Content } from '@/models';

interface DeployJob {
  websiteId: string;
  action: 'deploy' | 'full';
  contentId?: string;
  slug?: string;
}

async function processDeployJob(job: Job<DeployJob>): Promise<unknown> {
  const { websiteId, action, contentId, slug } = job.data;
  console.log(`[DeployWorker] Processing deploy: action=${action}, site=${websiteId}`);

  if (action === 'deploy') {
    const result = await triggerVercelDeploy(websiteId);
    return { action: 'deploy', ...result };
  }

  // action === 'full': deploy latest unpublished content and trigger deploy
  await connectDB();
  const unpublished = await Content.find({
    websiteId,
    status: 'draft',
  }).sort({ createdAt: -1 }).limit(5).lean();

  const deployed: string[] = [];
  for (const content of unpublished) {
    try {
      const { buildMarkdownWithFrontmatter } = await import('@/services/contentService');

      const markdown = buildMarkdownWithFrontmatter({
        title: content.title,
        slug: content.slug,
        excerpt: content.excerpt || '',
        markdown: content.body,
        frontmatter: {
          title: content.title,
          date: new Date().toISOString(),
          description: content.metaDescription || '',
          author: 'Smaksly AI',
          category: content.type || 'General',
          tags: content.tags || [],
          featuredImage: '',
          focusKeyword: content.focusKeyword || '',
          draft: false,
        },
        headings: [],
        faqs: [],
        internalLinks: (content.internalLinks || []) as { anchorText: string; url: string }[],
        meta: {
          metaTitle: content.metaTitle || content.title,
          metaDescription: content.metaDescription || '',
          focusKeyword: content.focusKeyword || '',
          secondaryKeywords: content.secondaryKeywords || [],
        },
        wordCount: content.wordCount || 0,
        readingTime: content.readingTime || 0,
      });

      await deployArticle(websiteId, content._id.toString(), markdown, content.slug);
      deployed.push(content.slug);
    } catch (error) {
      console.error(`[DeployWorker] Failed to deploy ${content.slug}:`, error);
    }
  }

  await job.updateProgress(80);

  // Queue health check after deploy
  if (deployed.length > 0) {
    await addJob.healthCheck({ websiteId, runAutoFix: false }, { delay: 300000 }); // 5 min delay
  }

  await job.updateProgress(100);
  console.log(`[DeployWorker] Deployed ${deployed.length} articles`);
  return { action: 'full', deployed, count: deployed.length };
}

export function startDeployWorker() {
  const worker = createWorker<DeployJob>(QUEUE_NAMES.DEPLOY, processDeployJob, 1);

  worker.on('completed', (job) => {
    console.log(`[DeployWorker] Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[DeployWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[DeployWorker] Started');
  return worker;
}
