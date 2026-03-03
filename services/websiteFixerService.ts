/**
 * websiteFixerService.ts
 *
 * AI Website Fixer — Technical SEO + Reliability Engineer.
 *
 * Aggregates data from multiple sources into a concise snapshot,
 * sends ONE prompt to gpt-4o per website per run, and stores the
 * structured result as an AIFixReport.
 *
 * Cost controls:
 * - Sends aggregated stats only (never raw arrays)
 * - Results cached in Redis for 7 days per website
 * - Weekly cron frequency (not daily)
 */

import mongoose from 'mongoose';
import OpenAI from 'openai';
import { connectDB } from '@/lib/db';
import { Website, SEOMetric, HealthReport, Issue, AIFixReport, UptimeLog } from '@/models';
import type { IAIFixReport, IFixIssue } from '@/models/AIFixReport';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

// Redis cache helper (Upstash)
async function getCached(key: string): Promise<string | null> {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    return await redis.get<string>(key);
  } catch {
    return null;
  }
}

async function setCache(key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Redis unavailable — proceed without cache
  }
}

// ─── Data Aggregation ─────────────────────────────────────────────────────────

async function aggregateWebsiteData(websiteId: string) {
  const wid = new mongoose.Types.ObjectId(websiteId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  // 1. GSC metrics: sum over last 30 days
  const gscAgg = await SEOMetric.aggregate([
    { $match: { websiteId: wid, period: 'daily', date: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: null,
        totalClicks: { $sum: '$gsc.clicks' },
        totalImpressions: { $sum: '$gsc.impressions' },
        avgPosition: { $avg: '$gsc.position' },
        latestIndexedPages: { $last: '$gsc.indexedPages' },
        totalCrawlErrors: { $sum: '$gsc.crawlErrors' },
        latestLCP: { $last: '$coreWebVitals.lcp' },
        latestCLS: { $last: '$coreWebVitals.cls' },
        latestTTFB: { $last: '$coreWebVitals.ttfb' },
      },
    },
  ]);

  const gsc = gscAgg[0] ?? {};

  // 2. Latest health report
  const healthReport = await HealthReport.findOne({ websiteId: wid })
    .sort({ timestamp: -1 })
    .lean();

  // 3. Open issues count by severity
  const issueAgg = await Issue.aggregate([
    { $match: { websiteId: wid, status: { $in: ['open', 'fixing'] } } },
    { $group: { _id: '$severity', count: { $sum: 1 } } },
  ]);

  const issueCounts = issueAgg.reduce(
    (acc: Record<string, number>, i) => { acc[i._id] = i.count; return acc; },
    {}
  );

  // 4. Ranking drops (keywords that fell >5 positions in last 7 days)
  const { KeywordHistory } = await import('@/models');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const rankDropCount = await KeywordHistory.aggregate([
    { $match: { websiteId: wid, date: { $gte: sevenDaysAgo } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$keywordMasterId', latestRankChange: { $first: '$rankChange' } } },
    { $match: { latestRankChange: { $lt: -5 } } },
    { $count: 'total' },
  ]);

  const rankingDropKeywords = rankDropCount[0]?.total ?? 0;

  // 5. Uptime stats (last 30 days)
  const uptimeAgg = await UptimeLog.aggregate([
    { $match: { websiteId: wid, checkedAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        upCount: { $sum: { $cond: ['$isUp', 1, 0] } },
        avgLatency: { $avg: '$latencyMs' },
      },
    },
  ]);

  const uptime = uptimeAgg[0] ?? {};
  const uptimePercent =
    uptime.total > 0 ? Math.round((uptime.upCount / uptime.total) * 100) : 100;

  return {
    gscClicks: gsc.totalClicks ?? 0,
    gscImpressions: gsc.totalImpressions ?? 0,
    gscAvgPosition: gsc.avgPosition ? Math.round(gsc.avgPosition * 10) / 10 : 0,
    indexedPages: gsc.latestIndexedPages ?? healthReport?.gscMetrics?.indexedPages ?? 0,
    crawlErrors: gsc.totalCrawlErrors ?? 0,
    lcp: healthReport?.lighthouseMetrics?.lcp ?? gsc.latestLCP ?? 0,
    cls: healthReport?.lighthouseMetrics?.cls ?? gsc.latestCLS ?? 0,
    ttfb: healthReport?.lighthouseMetrics?.ttfb ?? gsc.latestTTFB ?? 0,
    performanceScore: healthReport?.lighthouseMetrics?.performanceScore ?? 0,
    openIssuesCount: Object.values(issueCounts).reduce((a: number, b) => a + (b as number), 0),
    rankingDropKeywords,
    uptimePercent,
    avgLatencyMs: uptime.avgLatency ? Math.round(uptime.avgLatency) : 0,
    brokenLinks: healthReport?.auditResults?.brokenLinks?.length ?? 0,
    missingMeta: healthReport?.auditResults?.missingMeta?.length ?? 0,
    thinContent: healthReport?.auditResults?.thinContent?.length ?? 0,
    orphanPages: healthReport?.auditResults?.orphanPages?.length ?? 0,
  };
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior Technical SEO and Reliability Engineer.
Analyse the website health data and return a structured JSON report.

Rules:
- NEVER guess without data. Only flag real issues evidenced by the metrics.
- If no technical problems, say so clearly in summary.
- healthScore is 0-100 (100 = perfect).
- Classify issues: critical (site-breaking), high (significant ranking/traffic risk), medium (worth fixing), low (nice to have).
- fixSteps must be specific and actionable (not generic advice).
- automatable = true only if it can be programmatically fixed without human review.

Return ONLY this JSON structure, no other text:
{
  "healthScore": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "indexing|crawlability|page_speed|core_web_vitals|content|meta_seo|backlinks|ranking|uptime|redirects|security",
      "problem": "<what is wrong>",
      "reason": "<why this is happening based on the data>",
      "impact": "<effect on rankings/traffic/users>",
      "fixSteps": ["step 1", "step 2", "step 3"],
      "automatable": <true|false>
    }
  ],
  "quickWins": ["<low effort, high impact action>"],
  "longTermImprovements": ["<strategic improvement>"]
}`;

// ─── Main Runner ──────────────────────────────────────────────────────────────

export async function runAnalysis(
  websiteId: string,
  triggeredBy: 'cron' | 'manual' | 'webhook' = 'manual'
): Promise<IAIFixReport> {
  await connectDB();

  const website = await Website.findById(websiteId).lean();
  if (!website) throw new Error(`Website not found: ${websiteId}`);

  const cacheKey = `ai_fixer:${websiteId}`;

  // Check Redis cache (7 day TTL for weekly cron)
  if (triggeredBy === 'cron') {
    const cached = await getCached(cacheKey);
    if (cached) {
      console.log(`[WebsiteFixerService] Using cached report for ${website.name}`);
      const report = await AIFixReport.findOne({ websiteId: new mongoose.Types.ObjectId(websiteId) })
        .sort({ triggeredAt: -1 })
        .lean();
      if (report) return report as unknown as IAIFixReport;
    }
  }

  const startTime = Date.now();
  const snapshot = await aggregateWebsiteData(websiteId);

  // Build user message with aggregated stats only
  const dataMessage = `Website: ${website.name} (${website.domain})
Niche: ${website.niche || 'general'}
Analysis period: last 30 days

GSC Performance:
- Total clicks: ${snapshot.gscClicks}
- Total impressions: ${snapshot.gscImpressions}
- Average position: ${snapshot.gscAvgPosition}
- Indexed pages: ${snapshot.indexedPages}
- Crawl errors: ${snapshot.crawlErrors}

Core Web Vitals:
- LCP: ${snapshot.lcp}ms
- CLS: ${snapshot.cls}
- TTFB: ${snapshot.ttfb}ms
- Lighthouse performance score: ${snapshot.performanceScore}/100

Content Health:
- Broken links: ${snapshot.brokenLinks}
- Missing meta tags: ${snapshot.missingMeta}
- Thin content pages: ${snapshot.thinContent}
- Orphan pages: ${snapshot.orphanPages}

Rankings:
- Keywords with rank drop >5 positions (7d): ${snapshot.rankingDropKeywords}

Open Issues:
- Total open issues: ${snapshot.openIssuesCount}

Uptime (30d):
- Uptime: ${snapshot.uptimePercent}%
- Average latency: ${snapshot.avgLatencyMs}ms`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: dataMessage },
    ],
    temperature: 0.2, // deterministic outputs
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });

  const tokensUsed = completion.usage?.total_tokens ?? 0;
  const processingMs = Date.now() - startTime;
  const raw = completion.choices[0]?.message?.content ?? '{}';

  let aiResult: {
    healthScore: number;
    summary: string;
    issues: IFixIssue[];
    quickWins: string[];
    longTermImprovements: string[];
  };

  try {
    aiResult = JSON.parse(raw);
  } catch {
    throw new Error('[WebsiteFixerService] Failed to parse AI response as JSON');
  }

  // Get previous health score for delta
  const previousReport = await AIFixReport.findOne({
    websiteId: new mongoose.Types.ObjectId(websiteId),
  })
    .sort({ triggeredAt: -1 })
    .select('healthScore')
    .lean();

  const previousHealthScore = previousReport?.healthScore;
  const healthScoreDelta =
    previousHealthScore !== undefined
      ? aiResult.healthScore - previousHealthScore
      : undefined;

  // Count issues by severity
  const issues: IFixIssue[] = aiResult.issues ?? [];
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;

  // Save report
  const report = await AIFixReport.create({
    websiteId: new mongoose.Types.ObjectId(websiteId),
    healthScore: Math.min(100, Math.max(0, Math.round(aiResult.healthScore))),
    previousHealthScore,
    healthScoreDelta,
    summary: aiResult.summary,
    analysisModel: 'gpt-4o',
    dataSnapshot: {
      period: 'last_30_days',
      gscClicks: snapshot.gscClicks,
      gscImpressions: snapshot.gscImpressions,
      gscAvgPosition: snapshot.gscAvgPosition,
      indexedPages: snapshot.indexedPages,
      crawlErrors: snapshot.crawlErrors,
      lcp: snapshot.lcp,
      cls: snapshot.cls,
      ttfb: snapshot.ttfb,
      performanceScore: snapshot.performanceScore,
      uptimePercent: snapshot.uptimePercent,
      avgLatencyMs: snapshot.avgLatencyMs,
      openIssuesCount: snapshot.openIssuesCount,
      rankingDropKeywords: snapshot.rankingDropKeywords,
    },
    issues,
    quickWins: aiResult.quickWins ?? [],
    longTermImprovements: aiResult.longTermImprovements ?? [],
    issueCount: issues.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    tokenCount: tokensUsed,
    processingMs,
    cacheKey,
    triggeredBy,
    triggeredAt: new Date(),
  });

  // Cache result in Redis (7 days TTL)
  await setCache(cacheKey, report._id.toString(), 60 * 60 * 24 * 7);

  console.log(
    `[WebsiteFixerService] ${website.name}: score=${report.healthScore}, issues=${issues.length}, tokens=${tokensUsed}`
  );

  return report.toObject();
}

/**
 * Run analysis for all active websites (used by cron worker).
 */
export async function runAnalysisForAll(): Promise<{
  processed: number;
  errors: number;
  results: { websiteId: string; name: string; healthScore: number }[];
}> {
  await connectDB();

  const websites = await Website.find({ status: 'active' }).select('_id name').lean();
  const results: { websiteId: string; name: string; healthScore: number }[] = [];
  let errors = 0;

  for (const website of websites) {
    try {
      const report = await runAnalysis(website._id.toString(), 'cron');
      results.push({
        websiteId: website._id.toString(),
        name: website.name,
        healthScore: report.healthScore,
      });
    } catch (err) {
      console.error(`[WebsiteFixerService] Failed for ${website.name}:`, err);
      errors++;
    }
  }

  return { processed: results.length, errors, results };
}
