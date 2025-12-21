import mongoose, { Schema, Document, Model } from 'mongoose';

export type MetricPeriod = 'daily' | 'weekly' | 'monthly';

export interface ISEOMetric extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  date: Date;
  period: MetricPeriod;

  // Google Search Console Metrics
  gsc: {
    clicks: number;
    impressions: number;
    ctr: number; // Click-through rate (percentage)
    position: number; // Average position
    indexedPages: number;
    crawlErrors: number;
    sitemapStatus: 'submitted' | 'pending' | 'error' | 'not_submitted';
  };

  // Google Analytics Metrics
  ga: {
    sessions: number;
    users: number;
    newUsers: number;
    pageviews: number;
    avgSessionDuration: number; // in seconds
    bounceRate: number; // percentage
    pagesPerSession: number;
  };

  // Traffic Sources
  trafficSources: {
    organic: number;
    direct: number;
    referral: number;
    social: number;
    email: number;
    paid: number;
  };

  // Top Pages
  topPages: {
    url: string;
    pageviews: number;
    avgTimeOnPage: number;
    bounceRate: number;
  }[];

  // Top Keywords
  topKeywords: {
    keyword: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];

  // Ranking Distribution
  rankingDistribution: {
    top3: number;
    top10: number;
    top20: number;
    top50: number;
    top100: number;
  };

  // Core Web Vitals
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint (ms)
    fid: number; // First Input Delay (ms)
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte (ms)
    fcp: number; // First Contentful Paint (ms)
    status: 'good' | 'needs_improvement' | 'poor';
  };

  // Backlinks (from third-party tools)
  backlinks: {
    total: number;
    doFollow: number;
    noFollow: number;
    referringDomains: number;
    newBacklinks: number;
    lostBacklinks: number;
  };

  // Domain Metrics
  domainMetrics: {
    da: number; // Domain Authority (Moz)
    dr: number; // Domain Rating (Ahrefs)
    tf: number; // Trust Flow (Majestic)
    cf: number; // Citation Flow (Majestic)
    spamScore: number;
  };

  // Alerts
  alerts: {
    type: 'penalty' | 'traffic_drop' | 'indexing_issue' | 'ranking_drop' | 'crawl_error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    detectedAt: Date;
    resolved: boolean;
    resolvedAt?: Date;
  }[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const SEOMetricSchema = new Schema<ISEOMetric>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily',
      index: true,
    },

    // Google Search Console
    gsc: {
      clicks: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      position: { type: Number, default: 0 },
      indexedPages: { type: Number, default: 0 },
      crawlErrors: { type: Number, default: 0 },
      sitemapStatus: {
        type: String,
        enum: ['submitted', 'pending', 'error', 'not_submitted'],
        default: 'not_submitted',
      },
    },

    // Google Analytics
    ga: {
      sessions: { type: Number, default: 0 },
      users: { type: Number, default: 0 },
      newUsers: { type: Number, default: 0 },
      pageviews: { type: Number, default: 0 },
      avgSessionDuration: { type: Number, default: 0 },
      bounceRate: { type: Number, default: 0 },
      pagesPerSession: { type: Number, default: 0 },
    },

    // Traffic Sources
    trafficSources: {
      organic: { type: Number, default: 0 },
      direct: { type: Number, default: 0 },
      referral: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      email: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
    },

    // Top Pages
    topPages: [{
      url: { type: String },
      pageviews: { type: Number },
      avgTimeOnPage: { type: Number },
      bounceRate: { type: Number },
    }],

    // Top Keywords
    topKeywords: [{
      keyword: { type: String },
      clicks: { type: Number },
      impressions: { type: Number },
      ctr: { type: Number },
      position: { type: Number },
    }],

    // Ranking Distribution
    rankingDistribution: {
      top3: { type: Number, default: 0 },
      top10: { type: Number, default: 0 },
      top20: { type: Number, default: 0 },
      top50: { type: Number, default: 0 },
      top100: { type: Number, default: 0 },
    },

    // Core Web Vitals
    coreWebVitals: {
      lcp: { type: Number, default: 0 },
      fid: { type: Number, default: 0 },
      cls: { type: Number, default: 0 },
      ttfb: { type: Number, default: 0 },
      fcp: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['good', 'needs_improvement', 'poor'],
        default: 'good',
      },
    },

    // Backlinks
    backlinks: {
      total: { type: Number, default: 0 },
      doFollow: { type: Number, default: 0 },
      noFollow: { type: Number, default: 0 },
      referringDomains: { type: Number, default: 0 },
      newBacklinks: { type: Number, default: 0 },
      lostBacklinks: { type: Number, default: 0 },
    },

    // Domain Metrics
    domainMetrics: {
      da: { type: Number, default: 0 },
      dr: { type: Number, default: 0 },
      tf: { type: Number, default: 0 },
      cf: { type: Number, default: 0 },
      spamScore: { type: Number, default: 0 },
    },

    // Alerts
    alerts: [{
      type: {
        type: String,
        enum: ['penalty', 'traffic_drop', 'indexing_issue', 'ranking_drop', 'crawl_error'],
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      message: { type: String },
      detectedAt: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false },
      resolvedAt: { type: Date },
    }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
SEOMetricSchema.index({ websiteId: 1, date: -1 });
SEOMetricSchema.index({ websiteId: 1, period: 1, date: -1 });
SEOMetricSchema.index({ websiteId: 1, 'alerts.resolved': 1 });

// Virtuals
SEOMetricSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

// Method to check for alerts
SEOMetricSchema.methods.checkForAlerts = function (previousMetric?: ISEOMetric) {
  const alerts = [];

  if (previousMetric) {
    // Traffic drop > 30%
    if (previousMetric.gsc.clicks > 0) {
      const trafficChange = ((this.gsc.clicks - previousMetric.gsc.clicks) / previousMetric.gsc.clicks) * 100;
      if (trafficChange < -30) {
        alerts.push({
          type: 'traffic_drop',
          severity: trafficChange < -50 ? 'critical' : 'high',
          message: `Traffic dropped by ${Math.abs(trafficChange).toFixed(1)}%`,
          detectedAt: new Date(),
        });
      }
    }

    // Ranking drop
    if (previousMetric.gsc.position > 0 && this.gsc.position > previousMetric.gsc.position + 5) {
      alerts.push({
        type: 'ranking_drop',
        severity: this.gsc.position > previousMetric.gsc.position + 10 ? 'high' : 'medium',
        message: `Average position dropped from ${previousMetric.gsc.position.toFixed(1)} to ${this.gsc.position.toFixed(1)}`,
        detectedAt: new Date(),
      });
    }
  }

  // Crawl errors
  if (this.gsc.crawlErrors > 10) {
    alerts.push({
      type: 'crawl_error',
      severity: this.gsc.crawlErrors > 50 ? 'high' : 'medium',
      message: `${this.gsc.crawlErrors} crawl errors detected`,
      detectedAt: new Date(),
    });
  }

  // Indexing issues
  if (this.gsc.indexedPages === 0) {
    alerts.push({
      type: 'indexing_issue',
      severity: 'critical',
      message: 'No pages indexed in Google',
      detectedAt: new Date(),
    });
  }

  this.alerts = [...this.alerts, ...alerts];
  return alerts;
};

SEOMetricSchema.set('toJSON', { virtuals: true });
SEOMetricSchema.set('toObject', { virtuals: true });

export const SEOMetric: Model<ISEOMetric> =
  mongoose.models.SEOMetric || mongoose.model<ISEOMetric>('SEOMetric', SEOMetricSchema);
