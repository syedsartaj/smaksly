import mongoose from 'mongoose';
import { google } from 'googleapis';
import { connectDB } from '@/lib/db';
import { Website, Content, SEOMetric, HealthReport } from '@/models';
import { runLighthouseForSite } from '@/lib/lighthouse';
import { checkLinks, type PageLinks } from '@/lib/link-checker';
import type { HealthReport as HealthReportType, GSCHealthMetrics, LighthouseMetrics, AuditResults, BrokenLink, DuplicateTitle, MissingMeta, OrphanPage, ThinContentPage, HealthSummary } from '@/types/health';

const WEIGHTS = { lighthousePerformance: 20, lighthouseSEO: 15, gscTraffic: 15, gscIndexing: 10, contentQuality: 15, brokenLinks: 10, metaCompleteness: 10, internalLinking: 5 };

function getGSCAuth() {
  return new google.auth.JWT({ email: process.env.GOOGLE_CLIENT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
}

export async function collectGSCMetrics(siteId: string): Promise<GSCHealthMetrics> {
  await connectDB();
  const website = await Website.findById(siteId);
  if (!website) throw new Error(`Website not found: ${siteId}`);
  if (!website.gscConnected || !website.gscPropertyUrl) return { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0, indexedPages: 0, crawlErrors: 0, clicksTrend: 0, impressionsTrend: 0 };

  const auth = getGSCAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const rawDomain = website.domain.replace(/^https?:\/\//, '');
  const siteUrl = website.gscPropertyUrl || `sc-domain:${rawDomain}`;

  const endDate = new Date(); const startDate = new Date(); startDate.setDate(startDate.getDate() - 7);
  const prevEnd = new Date(startDate); const prevStart = new Date(startDate); prevStart.setDate(prevStart.getDate() - 7);

  const [currentRes, prevRes, pagesRes] = await Promise.all([
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: startDate.toISOString().slice(0, 10), endDate: endDate.toISOString().slice(0, 10), dimensions: ['date'], dataState: 'all' } }),
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: prevStart.toISOString().slice(0, 10), endDate: prevEnd.toISOString().slice(0, 10), dimensions: ['date'], dataState: 'all' } }),
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: startDate.toISOString().slice(0, 10), endDate: endDate.toISOString().slice(0, 10), dimensions: ['page'], dataState: 'all', rowLimit: 1000 } }),
  ]);

  const cur = currentRes.data.rows || []; const prev = prevRes.data.rows || [];
  const clicks = cur.reduce((s, r) => s + (r.clicks || 0), 0);
  const impressions = cur.reduce((s, r) => s + (r.impressions || 0), 0);
  const ctr = cur.length > 0 ? cur.reduce((s, r) => s + (r.ctr || 0), 0) / cur.length : 0;
  const avgPosition = cur.length > 0 ? cur.reduce((s, r) => s + (r.position || 0), 0) / cur.length : 0;
  const prevClicks = prev.reduce((s, r) => s + (r.clicks || 0), 0);
  const prevImpressions = prev.reduce((s, r) => s + (r.impressions || 0), 0);

  return {
    clicks, impressions, ctr, avgPosition,
    indexedPages: pagesRes.data.rows?.length || 0, crawlErrors: 0,
    clicksTrend: prevClicks > 0 ? Math.round(((clicks - prevClicks) / prevClicks) * 1000) / 10 : 0,
    impressionsTrend: prevImpressions > 0 ? Math.round(((impressions - prevImpressions) / prevImpressions) * 1000) / 10 : 0,
  };
}

export async function runLighthouseAudit(siteId: string): Promise<LighthouseMetrics> {
  await connectDB();
  const website = await Website.findById(siteId);
  if (!website) throw new Error(`Website not found: ${siteId}`);
  return runLighthouseForSite(website.customDomain || website.domain, 'mobile');
}

export async function auditSEOIssues(siteId: string): Promise<AuditResults> {
  await connectDB();
  const website = await Website.findById(siteId);
  if (!website) throw new Error(`Website not found: ${siteId}`);

  const domain = website.customDomain || website.domain;
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const allContent = await Content.find({ websiteId: new mongoose.Types.ObjectId(siteId), status: 'published' })
    .select('title slug metaTitle metaDescription canonicalUrl body wordCount internalLinks outboundLinks _id').lean();

  // Broken links
  const pageLinks: PageLinks[] = [];
  for (const c of allContent) {
    const links: { url: string; anchorText: string }[] = [...(c.outboundLinks || []).map((l: { url: string; anchorText: string }) => ({ url: l.url, anchorText: l.anchorText }))];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(c.body)) !== null) links.push({ url: match[1], anchorText: match[2] });
    if (links.length > 0) pageLinks.push({ sourceUrl: `${baseUrl}/blog/${c.slug}`, links });
  }
  let brokenLinks: BrokenLink[] = [];
  try { brokenLinks = pageLinks.length > 0 ? await checkLinks(pageLinks) : []; } catch (e) { console.error('[HealthAnalyzer] Link check failed:', e); }

  // Duplicate titles
  const titleMap = new Map<string, string[]>();
  for (const c of allContent) { const n = c.title.trim().toLowerCase(); if (!titleMap.has(n)) titleMap.set(n, []); titleMap.get(n)!.push(`/blog/${c.slug}`); }
  const duplicateTitles: DuplicateTitle[] = Array.from(titleMap.entries()).filter(([, u]) => u.length > 1).map(([title, urls]) => ({ title, urls }));

  // Missing meta
  const missingMeta: MissingMeta[] = allContent.filter((c) => !c.metaTitle || !c.metaDescription || !c.canonicalUrl)
    .map((c) => ({ url: `${baseUrl}/blog/${c.slug}`, missingTitle: !c.metaTitle, missingDescription: !c.metaDescription, missingCanonical: !c.canonicalUrl }));

  // Orphan pages
  const linkedSlugs = new Set<string>();
  for (const c of allContent) for (const link of (c.internalLinks || [])) linkedSlugs.add((link as { url: string }).url.replace(/^\/blog\//, '').replace(/^\//, ''));
  const orphanPages: OrphanPage[] = allContent.filter((c) => !linkedSlugs.has(c.slug)).map((c) => ({ url: `${baseUrl}/blog/${c.slug}`, slug: c.slug, internalLinksCount: 0 }));

  // Thin content
  const thinContent: ThinContentPage[] = allContent.filter((c) => c.wordCount < 800).map((c) => ({ url: `${baseUrl}/blog/${c.slug}`, slug: c.slug, wordCount: c.wordCount, contentId: (c._id as mongoose.Types.ObjectId).toString() }));

  return { brokenLinks, duplicateTitles, missingMeta, orphanPages, thinContent };
}

export function calculateSEOScore(gsc: GSCHealthMetrics, lh: LighthouseMetrics, audit: AuditResults, totalContent: number): number {
  let score = 0;
  score += (lh.performanceScore / 100) * WEIGHTS.lighthousePerformance;
  score += (lh.seoScore / 100) * WEIGHTS.lighthouseSEO;
  if (gsc.clicksTrend >= 0) score += WEIGHTS.gscTraffic; else if (gsc.clicksTrend > -15) score += WEIGHTS.gscTraffic * 0.7; else if (gsc.clicksTrend > -30) score += WEIGHTS.gscTraffic * 0.4;
  if (totalContent > 0 && gsc.indexedPages > 0) score += Math.min(gsc.indexedPages / totalContent, 1) * WEIGHTS.gscIndexing;
  if (totalContent > 0) score += Math.max(0, 1 - (audit.thinContent.length / totalContent) * 2) * WEIGHTS.contentQuality; else score += WEIGHTS.contentQuality;
  score += audit.brokenLinks.length === 0 ? WEIGHTS.brokenLinks : audit.brokenLinks.length <= 3 ? WEIGHTS.brokenLinks * 0.7 : audit.brokenLinks.length <= 10 ? WEIGHTS.brokenLinks * 0.3 : 0;
  if (totalContent > 0) score += Math.max(0, 1 - audit.missingMeta.length / totalContent) * WEIGHTS.metaCompleteness; else score += WEIGHTS.metaCompleteness;
  if (totalContent > 0) score += Math.max(0, 1 - audit.orphanPages.length / totalContent) * WEIGHTS.internalLinking; else score += WEIGHTS.internalLinking;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function buildSummary(audit: AuditResults): HealthSummary {
  const critical = audit.brokenLinks.length + audit.thinContent.length;
  const warnings = audit.duplicateTitles.length + audit.orphanPages.length;
  let passed = 0;
  if (audit.brokenLinks.length === 0) passed++; if (audit.duplicateTitles.length === 0) passed++;
  if (audit.missingMeta.length === 0) passed++; if (audit.orphanPages.length === 0) passed++; if (audit.thinContent.length === 0) passed++;
  return { totalIssues: critical + warnings + audit.missingMeta.length, criticalIssues: critical, warnings, passed };
}

export async function runFullHealthCheck(siteId: string): Promise<HealthReportType> {
  await connectDB();
  const totalContent = await Content.countDocuments({ websiteId: new mongoose.Types.ObjectId(siteId), status: 'published' });

  const [gscMetrics, lighthouseMetrics, auditResults] = await Promise.all([collectGSCMetrics(siteId), runLighthouseAudit(siteId), auditSEOIssues(siteId)]);
  const seoScore = calculateSEOScore(gscMetrics, lighthouseMetrics, auditResults, totalContent);
  const summary = buildSummary(auditResults);

  const report: HealthReportType = { siteId, timestamp: new Date(), seoScore, gscMetrics, lighthouseMetrics, auditResults, summary };

  await HealthReport.create({ websiteId: new mongoose.Types.ObjectId(siteId), timestamp: report.timestamp, seoScore, gscMetrics, lighthouseMetrics, auditResults, summary });
  await SEOMetric.findOneAndUpdate(
    { websiteId: new mongoose.Types.ObjectId(siteId), date: new Date().toISOString().slice(0, 10) },
    { $set: { coreWebVitals: { lcp: lighthouseMetrics.lcp, fid: lighthouseMetrics.fid, cls: lighthouseMetrics.cls, ttfb: lighthouseMetrics.ttfb, fcp: lighthouseMetrics.fcp, status: lighthouseMetrics.performanceScore >= 90 ? 'good' : lighthouseMetrics.performanceScore >= 50 ? 'needs_improvement' : 'poor' } } },
    { upsert: true }
  );

  return report;
}
