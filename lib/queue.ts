import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { getIORedisConnection } from './redis';

// Queue names
export const QUEUE_NAMES = {
  KEYWORD_RESEARCH: 'keyword-research',
  CONTENT_GENERATION: 'content-generation',
  SEO_SYNC: 'seo-sync',
  GUEST_POST_EXPIRY: 'guest-post-expiry',
  INDEXING_CHECK: 'indexing-check',
  ANALYTICS_SYNC: 'analytics-sync',
  EMAIL_NOTIFICATION: 'email-notification',
  COMMISSION_CALCULATION: 'commission-calculation',
  SEARCH_INDEX_SYNC: 'search-index-sync',
  HEALTH_CHECK: 'health-check',
  AUTO_FIX: 'auto-fix',
  DEPLOY: 'deploy',
} as const;

// Job types
export interface KeywordResearchJob {
  websiteId: string;
  categoryId: string;
  seedKeywords?: string[];
}

export interface ContentGenerationJob {
  websiteId: string;
  keywordId: string;
  contentType: 'informational' | 'commercial' | 'affiliate';
  autoPublish: boolean;
}

export interface SEOSyncJob {
  websiteId: string;
  syncType: 'gsc' | 'ga' | 'both';
}

export interface GuestPostExpiryJob {
  guestPostId: string;
  action: 'check' | 'expire' | 'notify';
}

export interface IndexingCheckJob {
  websiteId: string;
  urls?: string[];
}

export interface AnalyticsSyncJob {
  websiteId: string;
  dateRange: 'daily' | 'weekly' | 'monthly';
}

export interface EmailNotificationJob {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export interface CommissionCalculationJob {
  orderId: string;
  partnerId: string;
}

export interface SearchIndexSyncJob {
  websiteId: string;
  action: 'add' | 'update' | 'delete';
}

// Create queue instance
export const createQueue = <T>(name: string): Queue<T> => {
  return new Queue<T>(name, {
    connection: getIORedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 3600, // 24 hours
      },
      removeOnFail: {
        count: 5000,
        age: 7 * 24 * 3600, // 7 days
      },
    },
  });
};

// Create worker instance
export const createWorker = <T>(
  name: string,
  processor: (job: Job<T>) => Promise<unknown>,
  concurrency = 5
): Worker<T> => {
  return new Worker<T>(name, processor, {
    connection: getIORedisConnection(),
    concurrency,
  });
};

// Queue instances (lazy initialization)
let queues: Record<string, Queue> = {};

export const getQueue = <T>(name: string): Queue<T> => {
  if (!queues[name]) {
    queues[name] = createQueue<T>(name);
  }
  return queues[name] as Queue<T>;
};

// Convenience functions for adding jobs
export const addJob = {
  keywordResearch: async (data: KeywordResearchJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<KeywordResearchJob>(QUEUE_NAMES.KEYWORD_RESEARCH);
    return queue.add('research', data, options);
  },

  contentGeneration: async (data: ContentGenerationJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<ContentGenerationJob>(QUEUE_NAMES.CONTENT_GENERATION);
    return queue.add('generate', data, options);
  },

  seoSync: async (data: SEOSyncJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<SEOSyncJob>(QUEUE_NAMES.SEO_SYNC);
    return queue.add('sync', data, options);
  },

  guestPostExpiry: async (data: GuestPostExpiryJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<GuestPostExpiryJob>(QUEUE_NAMES.GUEST_POST_EXPIRY);
    return queue.add('expiry', data, options);
  },

  indexingCheck: async (data: IndexingCheckJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<IndexingCheckJob>(QUEUE_NAMES.INDEXING_CHECK);
    return queue.add('check', data, options);
  },

  analyticsSync: async (data: AnalyticsSyncJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<AnalyticsSyncJob>(QUEUE_NAMES.ANALYTICS_SYNC);
    return queue.add('sync', data, options);
  },

  emailNotification: async (data: EmailNotificationJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<EmailNotificationJob>(QUEUE_NAMES.EMAIL_NOTIFICATION);
    return queue.add('send', data, options);
  },

  commissionCalculation: async (data: CommissionCalculationJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<CommissionCalculationJob>(QUEUE_NAMES.COMMISSION_CALCULATION);
    return queue.add('calculate', data, options);
  },

  searchIndexSync: async (data: SearchIndexSyncJob, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<SearchIndexSyncJob>(QUEUE_NAMES.SEARCH_INDEX_SYNC);
    return queue.add('sync', data, options);
  },

  healthCheck: async (data: { websiteId: string; runAutoFix?: boolean }, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<typeof data>(QUEUE_NAMES.HEALTH_CHECK);
    return queue.add('check', data, options);
  },

  autoFix: async (data: { type: 'single' | 'site'; issueId?: string; websiteId?: string }, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<typeof data>(QUEUE_NAMES.AUTO_FIX);
    return queue.add('fix', data, options);
  },

  deploy: async (data: { websiteId: string; action: 'deploy' | 'full' }, options?: { delay?: number; priority?: number }) => {
    const queue = getQueue<typeof data>(QUEUE_NAMES.DEPLOY);
    return queue.add('deploy', data, options);
  },
};

// Scheduled/Repeatable jobs
export const scheduleRecurringJobs = async () => {
  // Daily keyword research at 2 AM
  const keywordQueue = getQueue<KeywordResearchJob>(QUEUE_NAMES.KEYWORD_RESEARCH);
  await keywordQueue.add(
    'daily-research',
    { websiteId: 'all', categoryId: 'all' },
    {
      repeat: {
        pattern: '0 2 * * *', // 2 AM daily
      },
    }
  );

  // Hourly guest post expiry check
  const expiryQueue = getQueue<GuestPostExpiryJob>(QUEUE_NAMES.GUEST_POST_EXPIRY);
  await expiryQueue.add(
    'hourly-check',
    { guestPostId: 'all', action: 'check' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );

  // Daily SEO sync at 3 AM
  const seoQueue = getQueue<SEOSyncJob>(QUEUE_NAMES.SEO_SYNC);
  await seoQueue.add(
    'daily-sync',
    { websiteId: 'all', syncType: 'both' },
    {
      repeat: {
        pattern: '0 3 * * *', // 3 AM daily
      },
    }
  );

};

// Get queue events for monitoring
export const getQueueEvents = (name: string): QueueEvents => {
  return new QueueEvents(name, {
    connection: getIORedisConnection(),
  });
};

// Clean up all queues
export const closeAllQueues = async (): Promise<void> => {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
  queues = {};
};
