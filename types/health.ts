export interface HealthReport {
  siteId: string;
  timestamp: Date;
  seoScore: number;
  gscMetrics: GSCHealthMetrics;
  lighthouseMetrics: LighthouseMetrics;
  auditResults: AuditResults;
  summary: HealthSummary;
}

export interface GSCHealthMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  indexedPages: number;
  crawlErrors: number;
  clicksTrend: number;
  impressionsTrend: number;
}

export interface LighthouseMetrics {
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  fcp: number;
  si: number;
}

export interface AuditResults {
  brokenLinks: BrokenLink[];
  duplicateTitles: DuplicateTitle[];
  missingMeta: MissingMeta[];
  orphanPages: OrphanPage[];
  thinContent: ThinContentPage[];
}

export interface BrokenLink {
  sourceUrl: string;
  targetUrl: string;
  statusCode: number;
  anchorText: string;
}

export interface DuplicateTitle {
  title: string;
  urls: string[];
}

export interface MissingMeta {
  url: string;
  missingTitle: boolean;
  missingDescription: boolean;
  missingCanonical: boolean;
}

export interface OrphanPage {
  url: string;
  slug: string;
  internalLinksCount: number;
}

export interface ThinContentPage {
  url: string;
  slug: string;
  wordCount: number;
  contentId: string;
}

export interface HealthSummary {
  totalIssues: number;
  criticalIssues: number;
  warnings: number;
  passed: number;
}

export interface SEOScoreWeights {
  gscClicks: number;
  gscImpressions: number;
  lighthousePerformance: number;
  lighthouseSEO: number;
  brokenLinks: number;
  contentQuality: number;
  indexing: number;
}
