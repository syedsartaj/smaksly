import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website, UptimeLog } from '@/models';
import mongoose from 'mongoose';
import type { UptimeStatus } from '@/models/UptimeLog';

const PING_TIMEOUT_MS = 10_000;

async function pingUrl(url: string) {
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
    const status: UptimeStatus = !isUp
      ? statusCode >= 500 ? 'down' : 'degraded'
      : latencyMs > 5000 ? 'degraded' : 'up';
    return { statusCode, latencyMs, isUp, status };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isAborted = err instanceof Error && err.name === 'AbortError';
    return {
      statusCode: null,
      latencyMs: isAborted ? PING_TIMEOUT_MS : latencyMs,
      isUp: false,
      status: (isAborted ? 'timeout' : 'error') as UptimeStatus,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// POST /api/uptime/ping
// Manual ping for a specific website or all websites
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { websiteId } = body;

    const filter = websiteId && mongoose.isValidObjectId(websiteId)
      ? { _id: websiteId }
      : { status: 'active' };

    const websites = await Website.find(filter)
      .select('_id name domain customDomain')
      .lean();

    if (!websites.length) {
      return NextResponse.json({ success: false, error: 'No websites found' }, { status: 404 });
    }

    const checkedAt = new Date();
    const results = await Promise.allSettled(
      websites.map(async (site) => {
        const domain = site.customDomain || site.domain;
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        const result = await pingUrl(url);

        await UptimeLog.create({
          websiteId: site._id,
          url,
          ...result,
          checkedAt,
        });

        return { name: site.name, url, ...result };
      })
    );

    const summary = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { error: (r as PromiseRejectedResult).reason }
    );

    const upCount = summary.filter((r) => (r as { isUp?: boolean }).isUp).length;

    return NextResponse.json({
      success: true,
      data: summary,
      stats: { total: websites.length, up: upCount, down: websites.length - upCount },
    });
  } catch (error) {
    console.error('[API] POST /uptime/ping:', error);
    return NextResponse.json({ success: false, error: 'Ping failed' }, { status: 500 });
  }
}
