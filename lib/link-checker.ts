import type { BrokenLink } from '@/types/health';

const TIMEOUT_MS = 10_000;
const MAX_CONCURRENT = 10;
const USER_AGENT = 'SmakslyBot/1.0';

interface LinkCheckResult {
  url: string;
  statusCode: number;
  ok: boolean;
}

async function checkSingleLink(url: string): Promise<LinkCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { url, statusCode: response.status, ok: response.ok };
  } catch {
    clearTimeout(timeout);
    // HEAD blocked, try GET
    try {
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), TIMEOUT_MS);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, 'Range': 'bytes=0-0' },
        redirect: 'follow',
        signal: getController.signal,
      });
      clearTimeout(getTimeout);
      return { url, statusCode: response.status, ok: response.ok };
    } catch {
      return { url, statusCode: 0, ok: false };
    }
  }
}

async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) results.push(await processor(item));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export interface PageLinks {
  sourceUrl: string;
  links: { url: string; anchorText: string }[];
}

export async function checkLinks(pageLinks: PageLinks[]): Promise<BrokenLink[]> {
  const urlMap = new Map<string, { sourceUrl: string; anchorText: string }[]>();

  for (const page of pageLinks) {
    for (const link of page.links) {
      if (!link.url || link.url.startsWith('#') || link.url.startsWith('mailto:') || link.url.startsWith('tel:')) continue;
      try {
        const absoluteUrl = link.url.startsWith('http') ? link.url : new URL(link.url, page.sourceUrl).href;
        if (!urlMap.has(absoluteUrl)) urlMap.set(absoluteUrl, []);
        urlMap.get(absoluteUrl)!.push({ sourceUrl: page.sourceUrl, anchorText: link.anchorText });
      } catch { /* invalid URL */ }
    }
  }

  const results = await processInBatches(Array.from(urlMap.keys()), checkSingleLink, MAX_CONCURRENT);

  const brokenLinks: BrokenLink[] = [];
  for (const result of results) {
    if (!result.ok && result.statusCode !== 0) {
      const sources = urlMap.get(result.url) || [];
      for (const source of sources) {
        brokenLinks.push({
          sourceUrl: source.sourceUrl,
          targetUrl: result.url,
          statusCode: result.statusCode,
          anchorText: source.anchorText,
        });
      }
    }
  }
  return brokenLinks;
}
