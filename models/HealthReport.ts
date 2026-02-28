import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHealthReport extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  timestamp: Date;
  seoScore: number;
  gscMetrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
    indexedPages: number;
    crawlErrors: number;
    clicksTrend: number;
    impressionsTrend: number;
  };
  lighthouseMetrics: {
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
  };
  auditResults: {
    brokenLinks: { sourceUrl: string; targetUrl: string; statusCode: number; anchorText: string }[];
    duplicateTitles: { title: string; urls: string[] }[];
    missingMeta: { url: string; missingTitle: boolean; missingDescription: boolean; missingCanonical: boolean }[];
    orphanPages: { url: string; slug: string; internalLinksCount: number }[];
    thinContent: { url: string; slug: string; wordCount: number; contentId: string }[];
  };
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warnings: number;
    passed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const HealthReportSchema = new Schema<IHealthReport>(
  {
    websiteId: { type: Schema.Types.ObjectId, ref: 'Website', required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    seoScore: { type: Number, required: true, min: 0, max: 100, default: 0 },
    gscMetrics: {
      clicks: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      avgPosition: { type: Number, default: 0 },
      indexedPages: { type: Number, default: 0 },
      crawlErrors: { type: Number, default: 0 },
      clicksTrend: { type: Number, default: 0 },
      impressionsTrend: { type: Number, default: 0 },
    },
    lighthouseMetrics: {
      performanceScore: { type: Number, default: 0 },
      seoScore: { type: Number, default: 0 },
      accessibilityScore: { type: Number, default: 0 },
      bestPracticesScore: { type: Number, default: 0 },
      lcp: { type: Number, default: 0 },
      fid: { type: Number, default: 0 },
      cls: { type: Number, default: 0 },
      ttfb: { type: Number, default: 0 },
      fcp: { type: Number, default: 0 },
      si: { type: Number, default: 0 },
    },
    auditResults: {
      brokenLinks: [{ sourceUrl: String, targetUrl: String, statusCode: Number, anchorText: String }],
      duplicateTitles: [{ title: String, urls: [String] }],
      missingMeta: [{ url: String, missingTitle: Boolean, missingDescription: Boolean, missingCanonical: Boolean }],
      orphanPages: [{ url: String, slug: String, internalLinksCount: Number }],
      thinContent: [{ url: String, slug: String, wordCount: Number, contentId: String }],
    },
    summary: {
      totalIssues: { type: Number, default: 0 },
      criticalIssues: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      passed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

HealthReportSchema.index({ websiteId: 1, timestamp: -1 });
HealthReportSchema.index({ websiteId: 1, seoScore: 1 });

HealthReportSchema.virtual('website', {
  ref: 'Website', localField: 'websiteId', foreignField: '_id', justOne: true,
});

HealthReportSchema.set('toJSON', { virtuals: true });
HealthReportSchema.set('toObject', { virtuals: true });

export const HealthReport: Model<IHealthReport> =
  mongoose.models.HealthReport || mongoose.model<IHealthReport>('HealthReport', HealthReportSchema);
