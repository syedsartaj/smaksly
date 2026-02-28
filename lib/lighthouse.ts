import type { LighthouseMetrics } from '@/types/health';

const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

interface PSIResponse {
  lighthouseResult: {
    categories: {
      performance?: { score: number };
      seo?: { score: number };
      accessibility?: { score: number };
      'best-practices'?: { score: number };
    };
    audits: Record<string, { id: string; numericValue?: number; score?: number }>;
  };
  loadingExperience?: {
    metrics: Record<string, { percentile: number; category: string }>;
  };
}

export async function runPageSpeedAudit(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<LighthouseMetrics> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || '';

  const params = new URLSearchParams({ url, strategy });
  ['performance', 'seo', 'accessibility', 'best-practices'].forEach((cat) => {
    params.append('category', cat);
  });
  if (apiKey) params.set('key', apiKey);

  const response = await fetch(`${PAGESPEED_API_URL}?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PageSpeed Insights API error ${response.status}: ${text}`);
  }

  const data: PSIResponse = await response.json();
  const { categories, audits } = data.lighthouseResult;
  const fieldMetrics = data.loadingExperience?.metrics;

  const lcp = fieldMetrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile
    || audits['largest-contentful-paint']?.numericValue || 0;
  const fid = fieldMetrics?.FIRST_INPUT_DELAY_MS?.percentile
    || audits['max-potential-fid']?.numericValue || 0;
  const cls = fieldMetrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
    ? fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
    : audits['cumulative-layout-shift']?.numericValue || 0;
  const ttfb = fieldMetrics?.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile
    || audits['server-response-time']?.numericValue || 0;
  const fcp = fieldMetrics?.FIRST_CONTENTFUL_PAINT_MS?.percentile
    || audits['first-contentful-paint']?.numericValue || 0;
  const si = audits['speed-index']?.numericValue || 0;

  return {
    performanceScore: Math.round((categories.performance?.score || 0) * 100),
    seoScore: Math.round((categories.seo?.score || 0) * 100),
    accessibilityScore: Math.round((categories.accessibility?.score || 0) * 100),
    bestPracticesScore: Math.round((categories['best-practices']?.score || 0) * 100),
    lcp: Math.round(lcp),
    fid: Math.round(fid),
    cls: Math.round(cls * 1000) / 1000,
    ttfb: Math.round(ttfb),
    fcp: Math.round(fcp),
    si: Math.round(si),
  };
}

export async function runLighthouseForSite(
  domain: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<LighthouseMetrics> {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;
  try {
    return await runPageSpeedAudit(url, strategy);
  } catch (error) {
    console.error(`Lighthouse audit failed for ${url}:`, error);
    return {
      performanceScore: 0, seoScore: 0, accessibilityScore: 0, bestPracticesScore: 0,
      lcp: 0, fid: 0, cls: 0, ttfb: 0, fcp: 0, si: 0,
    };
  }
}
