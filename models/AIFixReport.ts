import mongoose, { Schema, Document, Model } from 'mongoose';

export type FixIssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FixIssueCategory =
  | 'indexing'
  | 'crawlability'
  | 'page_speed'
  | 'core_web_vitals'
  | 'content'
  | 'meta_seo'
  | 'backlinks'
  | 'ranking'
  | 'uptime'
  | 'redirects'
  | 'security';

export interface IFixIssue {
  severity: FixIssueSeverity;
  category: FixIssueCategory;
  problem: string;
  reason: string;
  impact: string;
  fixSteps: string[];
  automatable: boolean;
  autoFixType?: string; // maps to existing Issue.fixType enum
  affectedUrls?: string[];
  detectedMetric?: string; // e.g. "lcp: 4200ms"
}

export interface IAIFixReport extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;

  // Overall health
  healthScore: number;      // 0–100
  previousHealthScore?: number;
  healthScoreDelta?: number; // positive = improved

  // AI Summary
  summary: string;
  analysisModel: string;   // e.g. 'gpt-4o'

  // Data inputs used (aggregated stats, not raw)
  dataSnapshot: {
    period: string;         // e.g. 'last_30_days'
    gscClicks: number;
    gscImpressions: number;
    gscAvgPosition: number;
    indexedPages: number;
    crawlErrors: number;
    lcp: number;
    cls: number;
    ttfb: number;
    performanceScore: number;
    uptimePercent: number;
    avgLatencyMs: number;
    openIssuesCount: number;
    rankingDropKeywords: number;
  };

  // Detected issues
  issues: IFixIssue[];

  // Prioritised recommendations
  quickWins: string[];        // low effort, high impact
  longTermImprovements: string[];

  // Processing metadata
  issueCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;

  // Cache / rate-limiting
  tokenCount?: number;
  processingMs?: number;
  cacheKey?: string;           // Redis key used for caching

  // Trigger info
  triggeredBy: 'cron' | 'manual' | 'webhook';
  triggeredAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const FixIssueSchema = new Schema<IFixIssue>(
  {
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'indexing', 'crawlability', 'page_speed', 'core_web_vitals',
        'content', 'meta_seo', 'backlinks', 'ranking', 'uptime',
        'redirects', 'security',
      ],
      required: true,
    },
    problem: { type: String, required: true },
    reason: { type: String, required: true },
    impact: { type: String, required: true },
    fixSteps: [{ type: String }],
    automatable: { type: Boolean, default: false },
    autoFixType: { type: String },
    affectedUrls: [{ type: String }],
    detectedMetric: { type: String },
  },
  { _id: false }
);

const DataSnapshotSchema = new Schema(
  {
    period: { type: String, default: 'last_30_days' },
    gscClicks: { type: Number, default: 0 },
    gscImpressions: { type: Number, default: 0 },
    gscAvgPosition: { type: Number, default: 0 },
    indexedPages: { type: Number, default: 0 },
    crawlErrors: { type: Number, default: 0 },
    lcp: { type: Number, default: 0 },
    cls: { type: Number, default: 0 },
    ttfb: { type: Number, default: 0 },
    performanceScore: { type: Number, default: 0 },
    uptimePercent: { type: Number, default: 100 },
    avgLatencyMs: { type: Number, default: 0 },
    openIssuesCount: { type: Number, default: 0 },
    rankingDropKeywords: { type: Number, default: 0 },
  },
  { _id: false }
);

const AIFixReportSchema = new Schema<IAIFixReport>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },

    healthScore: { type: Number, required: true, min: 0, max: 100, default: 0 },
    previousHealthScore: { type: Number, min: 0, max: 100 },
    healthScoreDelta: { type: Number },

    summary: { type: String, required: true },
    analysisModel: { type: String, default: 'gpt-4o' },

    dataSnapshot: { type: DataSnapshotSchema, required: true },
    issues: [FixIssueSchema],

    quickWins: [{ type: String }],
    longTermImprovements: [{ type: String }],

    issueCount: { type: Number, default: 0 },
    criticalCount: { type: Number, default: 0 },
    highCount: { type: Number, default: 0 },
    mediumCount: { type: Number, default: 0 },
    lowCount: { type: Number, default: 0 },

    tokenCount: { type: Number },
    processingMs: { type: Number },
    cacheKey: { type: String },

    triggeredBy: {
      type: String,
      enum: ['cron', 'manual', 'webhook'],
      default: 'cron',
    },
    triggeredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Indexes
AIFixReportSchema.index({ websiteId: 1, triggeredAt: -1 });
AIFixReportSchema.index({ websiteId: 1, healthScore: 1 });
AIFixReportSchema.index({ triggeredAt: -1 });

// Virtuals
AIFixReportSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

AIFixReportSchema.set('toJSON', { virtuals: true });
AIFixReportSchema.set('toObject', { virtuals: true });

export const AIFixReport: Model<IAIFixReport> =
  mongoose.models.AIFixReport ||
  mongoose.model<IAIFixReport>('AIFixReport', AIFixReportSchema);
