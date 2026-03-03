/**
 * uptimePingerWorker.ts
 *
 * Built-in uptime monitoring pinger.
 * Runs every 5 minutes — pings all active website domains,
 * records status code + latency in UptimeLog (auto-expires after 90 days).
 *
 * Schedule: *\/5 * * * *
 */

import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '@/lib/queue';
import { connectDB } from '@/lib/db';
import { Website, UptimeLog } from '@/models';
import type { UptimeStatus } from '@/models/UptimeLog';

interface UptimePingJob {
  websiteId?: string; // 'all' or specific ID
}

const PING_TIMEOUT_MS = 10_000; // 10 second timeout per ping

async function pingUrl(url: string): Promise<{
  statusCode: number | null;
  latencyMs: number | null;
  isUp: boolean;
  status: UptimeStatus;
  errorMessage?: string;
}> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'DalmaSEO-UptimeMonitor/1.0' },
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - start;
    const statusCode = response.status;
    const isUp = statusCode >= 200 && statusCode < 400;

    let status: UptimeStatus = 'up';
    if (!isUp) {
      status = statusCode >= 500 ? 'down' : 'degraded';
    } else if (latencyMs > 5000) {
      status = 'degraded';
    }

    return { statusCode, latencyMs, isUp, status };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isAborted = err instanceof Error && err.name === 'AbortError';

    return {
      statusCode: null,
      latencyMs: isAborted ? PING_TIMEOUT_MS : latencyMs,
      isUp: false,
      status: isAborted ? 'timeout' : 'error',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function processUptimePing(job: Job<UptimePingJob>): Promise<unknown> {
  const { websiteId } = job.data;
  await connectDB();

  const query = websiteId && websiteId !== 'all'
    ? { _id: websiteId, status: 'active' }
    : { status: 'active' };

  const websites = await Website.find(query)
    .select('_id name domain customDomain')
    .lean();

  if (!websites.length) return { pinged: 0, up: 0, down: 0 };

  let up = 0;
  let down = 0;
  const checkedAt = new Date();

  const pingBatch = websites.map(async (site) => {
    const domain = site.customDomain || site.domain;
    const url = domain.startsWith('http') ? domain : `https://${domain}`;

    const result = await pingUrl(url);

    if (result.isUp) up++;
    else {
      down++;
      console.warn(`[UptimePinger] DOWN: ${site.name} (${url}) — ${result.status} ${result.statusCode ?? result.errorMessage}`);
    }

    return UptimeLog.create({
      websiteId: site._id,
      url,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      isUp: result.isUp,
      status: result.status,
      errorMessage: result.errorMessage,
      checkedAt,
    });
  });

  // Run all pings concurrently
  await Promise.allSettled(pingBatch);

  await job.updateProgress(100);
  return { pinged: websites.length, up, down };
}

export function startUptimePingerWorker() {
  const worker = createWorker<UptimePingJob>(
    QUEUE_NAMES.UPTIME_PING,
    processUptimePing,
    5 // concurrent — I/O bound
  );

  worker.on('completed', (job, result) => {
    const { pinged, up, down } = result as { pinged: number; up: number; down: number };
    console.log(`[UptimePinger] Job ${job.id} done: ${up}/${pinged} up, ${down} down`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[UptimePinger] Job ${job?.id} failed:`, err.message);
  });

  console.log('[UptimePinger] Started (every 5 min)');
  return worker;
}
