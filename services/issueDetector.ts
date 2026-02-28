import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Website, Content, Issue, HealthReport, SEOMetric } from '@/models';
import type { DetectedIssue } from '@/types/issue';
import type { AuditResults, HealthReport as HealthReportType } from '@/types/health';

const DEFAULT_CONFIG = {
  trafficDropThreshold: -20,
  performanceMinScore: 50,
  thinContentMinWords: 800,
  maxBrokenLinksPerPage: 0,
};

export async function detectAllIssues(siteId: string, healthReport?: HealthReportType): Promise<DetectedIssue[]> {
  await connectDB();
  const issues: DetectedIssue[] = [];

  const report = healthReport || await getLatestReport(siteId);
  if (!report) return issues;

  issues.push(
    ...detectTrafficDrop(siteId, report),
    ...detectSpeedIssues(siteId, report),
    ...detectBrokenLinks(siteId, report.auditResults),
    ...detectDuplicateTitles(siteId, report.auditResults),
    ...detectThinContent(siteId, report.auditResults),
    ...detectMissingMeta(siteId, report.auditResults),
    ...detectOrphanPages(siteId, report.auditResults),
  );

  const indexingIssues = await detectIndexingIssues(siteId, report);
  issues.push(...indexingIssues);

  return issues;
}

async function getLatestReport(siteId: string): Promise<HealthReportType | null> {
  const report = await HealthReport.findOne({ websiteId: new mongoose.Types.ObjectId(siteId) })
    .sort({ timestamp: -1 }).lean();
  if (!report) return null;
  return {
    siteId,
    timestamp: report.timestamp,
    seoScore: report.seoScore,
    gscMetrics: report.gscMetrics,
    lighthouseMetrics: report.lighthouseMetrics,
    auditResults: report.auditResults,
    summary: report.summary,
  };
}

export function detectTrafficDrop(siteId: string, report: HealthReportType): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const { clicksTrend, impressionsTrend } = report.gscMetrics;

  if (clicksTrend < DEFAULT_CONFIG.trafficDropThreshold) {
    issues.push({
      siteId,
      type: 'ranking_drop',
      severity: clicksTrend < -50 ? 'critical' : clicksTrend < -30 ? 'high' : 'medium',
      title: `Traffic dropped ${Math.abs(clicksTrend)}% week-over-week`,
      description: `Clicks decreased by ${Math.abs(clicksTrend)}% compared to last week. This may indicate a ranking drop, algorithm update, or indexing issue.`,
      details: { clicksTrend, impressionsTrend, clicks: report.gscMetrics.clicks, impressions: report.gscMetrics.impressions },
      suggestion: 'Check Google Search Console for manual actions, review recent algorithm updates, and audit content for quality issues.',
      autoFixable: false,
    });
  }

  if (impressionsTrend < -30) {
    issues.push({
      siteId,
      type: 'ranking_drop',
      severity: impressionsTrend < -50 ? 'critical' : 'high',
      title: `Impressions dropped ${Math.abs(impressionsTrend)}% week-over-week`,
      description: `Search impressions decreased significantly, suggesting possible deindexing or major ranking losses.`,
      details: { impressionsTrend, impressions: report.gscMetrics.impressions },
      suggestion: 'Verify pages are still indexed. Check for crawl errors in GSC. Review robots.txt and canonical tags.',
      autoFixable: false,
    });
  }

  return issues;
}

export function detectSpeedIssues(siteId: string, report: HealthReportType): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lh = report.lighthouseMetrics;

  if (lh.performanceScore < DEFAULT_CONFIG.performanceMinScore) {
    issues.push({
      siteId,
      type: 'speed_issue',
      severity: lh.performanceScore < 25 ? 'critical' : lh.performanceScore < 40 ? 'high' : 'medium',
      title: `Low performance score: ${lh.performanceScore}/100`,
      description: `Lighthouse performance score is ${lh.performanceScore}, below the minimum threshold of ${DEFAULT_CONFIG.performanceMinScore}.`,
      details: { performanceScore: lh.performanceScore, lcp: lh.lcp, fcp: lh.fcp, cls: lh.cls, ttfb: lh.ttfb, si: lh.si },
      suggestion: 'Optimize images, reduce JavaScript, enable caching, and consider lazy loading.',
      autoFixable: false,
    });
  }

  if (lh.lcp > 4000) {
    issues.push({
      siteId,
      type: 'speed_issue',
      severity: lh.lcp > 8000 ? 'critical' : 'high',
      title: `Slow LCP: ${(lh.lcp / 1000).toFixed(1)}s`,
      description: `Largest Contentful Paint is ${(lh.lcp / 1000).toFixed(1)}s, which is above the 2.5s threshold for a good user experience.`,
      details: { lcp: lh.lcp },
      suggestion: 'Optimize the largest element on the page. Compress hero images, preload fonts, and reduce server response time.',
      autoFixable: false,
    });
  }

  if (lh.cls > 0.25) {
    issues.push({
      siteId,
      type: 'speed_issue',
      severity: 'high',
      title: `High CLS: ${lh.cls.toFixed(3)}`,
      description: `Cumulative Layout Shift is ${lh.cls.toFixed(3)}, above the 0.1 threshold. This harms user experience and rankings.`,
      details: { cls: lh.cls },
      suggestion: 'Set explicit dimensions on images/ads, avoid inserting content above existing content dynamically.',
      autoFixable: false,
    });
  }

  return issues;
}

export function detectBrokenLinks(siteId: string, audit: AuditResults): DetectedIssue[] {
  if (audit.brokenLinks.length === 0) return [];
  return audit.brokenLinks.map((link) => ({
    siteId,
    type: 'broken_link' as const,
    severity: (link.statusCode >= 500 ? 'high' : 'medium') as DetectedIssue['severity'],
    title: `Broken link (${link.statusCode}): ${link.targetUrl.slice(0, 60)}`,
    description: `A link on ${link.sourceUrl} points to ${link.targetUrl} which returns HTTP ${link.statusCode}.`,
    details: { sourceUrl: link.sourceUrl, targetUrl: link.targetUrl, statusCode: link.statusCode, anchorText: link.anchorText },
    suggestion: `Remove or update the broken link to "${link.targetUrl}" on page ${link.sourceUrl}.`,
    autoFixable: true,
  }));
}

export function detectDuplicateTitles(siteId: string, audit: AuditResults): DetectedIssue[] {
  return audit.duplicateTitles.map((dup) => ({
    siteId,
    type: 'seo_issue' as const,
    severity: 'medium' as const,
    title: `Duplicate title: "${dup.title.slice(0, 50)}"`,
    description: `${dup.urls.length} pages share the same title "${dup.title}". This can confuse search engines and dilute rankings.`,
    details: { title: dup.title, urls: dup.urls, count: dup.urls.length },
    suggestion: 'Give each page a unique, descriptive title that includes its target keyword.',
    autoFixable: true,
  }));
}

export function detectThinContent(siteId: string, audit: AuditResults): DetectedIssue[] {
  return audit.thinContent.map((page) => ({
    siteId,
    contentId: page.contentId,
    type: 'content_issue' as const,
    severity: (page.wordCount < 300 ? 'high' : 'medium') as DetectedIssue['severity'],
    title: `Thin content: ${page.slug} (${page.wordCount} words)`,
    description: `Page "${page.slug}" has only ${page.wordCount} words, below the recommended minimum of ${DEFAULT_CONFIG.thinContentMinWords}.`,
    details: { url: page.url, slug: page.slug, wordCount: page.wordCount, contentId: page.contentId },
    suggestion: 'Expand the content with more detailed information, examples, and supporting data to improve rankings.',
    autoFixable: true,
  }));
}

export function detectMissingMeta(siteId: string, audit: AuditResults): DetectedIssue[] {
  return audit.missingMeta.map((page) => {
    const missing: string[] = [];
    if (page.missingTitle) missing.push('meta title');
    if (page.missingDescription) missing.push('meta description');
    if (page.missingCanonical) missing.push('canonical URL');

    return {
      siteId,
      type: 'seo_issue' as const,
      severity: (page.missingTitle ? 'high' : 'medium') as DetectedIssue['severity'],
      title: `Missing ${missing.join(', ')} on ${page.url.split('/').pop()}`,
      description: `Page ${page.url} is missing: ${missing.join(', ')}. These are critical for SEO.`,
      details: { url: page.url, missingTitle: page.missingTitle, missingDescription: page.missingDescription, missingCanonical: page.missingCanonical },
      suggestion: 'Add the missing meta tags. Meta title should be under 60 chars, description under 155 chars.',
      autoFixable: true,
    };
  });
}

export function detectOrphanPages(siteId: string, audit: AuditResults): DetectedIssue[] {
  if (audit.orphanPages.length === 0) return [];
  return audit.orphanPages.map((page) => ({
    siteId,
    type: 'seo_issue' as const,
    severity: 'low' as const,
    title: `Orphan page: ${page.slug}`,
    description: `Page "${page.slug}" has no internal links pointing to it. Search engines may have difficulty discovering and ranking it.`,
    details: { url: page.url, slug: page.slug, internalLinksCount: page.internalLinksCount },
    suggestion: 'Add internal links from related articles to this page to improve discoverability and link equity flow.',
    autoFixable: true,
  }));
}

export async function detectIndexingIssues(siteId: string, report: HealthReportType): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];
  await connectDB();

  const totalContent = await Content.countDocuments({
    websiteId: new mongoose.Types.ObjectId(siteId),
    status: 'published',
  });

  if (totalContent > 0 && report.gscMetrics.indexedPages > 0) {
    const indexRatio = report.gscMetrics.indexedPages / totalContent;
    if (indexRatio < 0.5) {
      issues.push({
        siteId,
        type: 'indexing_issue',
        severity: indexRatio < 0.25 ? 'critical' : 'high',
        title: `Low indexing rate: ${Math.round(indexRatio * 100)}%`,
        description: `Only ${report.gscMetrics.indexedPages} of ${totalContent} published pages appear to be indexed (${Math.round(indexRatio * 100)}%).`,
        details: { indexedPages: report.gscMetrics.indexedPages, totalContent, indexRatio: Math.round(indexRatio * 100) },
        suggestion: 'Submit missing URLs via the Indexing API. Check for noindex tags, crawl budget issues, or low-quality content.',
        autoFixable: true,
      });
    }
  }

  if (report.gscMetrics.crawlErrors > 5) {
    issues.push({
      siteId,
      type: 'indexing_issue',
      severity: report.gscMetrics.crawlErrors > 20 ? 'critical' : 'high',
      title: `${report.gscMetrics.crawlErrors} crawl errors detected`,
      description: `Google encountered ${report.gscMetrics.crawlErrors} crawl errors. This prevents pages from being indexed properly.`,
      details: { crawlErrors: report.gscMetrics.crawlErrors },
      suggestion: 'Fix server errors and broken URLs. Ensure all pages return proper HTTP status codes.',
      autoFixable: false,
    });
  }

  return issues;
}

export async function storeIssues(issues: DetectedIssue[]): Promise<{ created: number; duplicates: number }> {
  await connectDB();
  let created = 0;
  let duplicates = 0;

  for (const issue of issues) {
    const existing = await Issue.findOne({
      websiteId: new mongoose.Types.ObjectId(issue.siteId),
      type: issue.type,
      title: issue.title,
      status: { $in: ['open', 'fixing'] },
    });

    if (existing) {
      duplicates++;
      continue;
    }

    await Issue.create({
      websiteId: new mongoose.Types.ObjectId(issue.siteId),
      contentId: issue.contentId ? new mongoose.Types.ObjectId(issue.contentId) : undefined,
      type: issue.type,
      severity: issue.severity,
      status: 'open',
      title: issue.title,
      description: issue.description,
      details: issue.details,
      suggestion: issue.suggestion,
      autoFixable: issue.autoFixable,
      detectedAt: new Date(),
    });
    created++;
  }

  return { created, duplicates };
}

export async function runIssueDetection(siteId: string): Promise<{ detected: number; stored: { created: number; duplicates: number } }> {
  const issues = await detectAllIssues(siteId);
  const stored = await storeIssues(issues);
  console.log(`[IssueDetector] Site ${siteId}: detected=${issues.length}, created=${stored.created}, duplicates=${stored.duplicates}`);
  return { detected: issues.length, stored };
}
