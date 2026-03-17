import mongoose, { Schema, Document, Model } from 'mongoose';

export type CoverageState =
  | 'Submitted and indexed'
  | 'Crawled - currently not indexed'
  | 'Discovered - currently not indexed'
  | 'Page with redirect'
  | 'Not found (404)'
  | 'Soft 404'
  | 'Blocked by robots.txt'
  | 'Blocked due to unauthorized request (401)'
  | 'Blocked due to access forbidden (403)'
  | 'Blocked due to other 4xx issue'
  | 'Server error (5xx)'
  | 'Duplicate without user-selected canonical'
  | 'Duplicate, Google chose different canonical than user'
  | 'Duplicate, submitted URL not selected as canonical'
  | 'Excluded by noindex tag'
  | 'Alternate page with proper canonical tag'
  | 'Page is not indexed: unknown reason'
  | 'Unknown';

export type CoverageVerdict = 'PASS' | 'NEUTRAL' | 'FAIL' | 'UNKNOWN' | 'ERROR';

export interface IPageCoverage extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  url: string;
  verdict: CoverageVerdict;
  coverageState: string;
  robotsTxtState: string;
  indexingState: string;
  pageFetchState: string;
  crawledAs: string;
  lastCrawlTime?: Date;
  mobileUsability: string;
  referringUrls: string[];
  lastInspectedAt: Date;
  previousVerdict?: CoverageVerdict;
  previousCoverageState?: string;
  inspectionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PageCoverageSchema = new Schema<IPageCoverage>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    verdict: {
      type: String,
      enum: ['PASS', 'NEUTRAL', 'FAIL', 'UNKNOWN', 'ERROR'],
      default: 'UNKNOWN',
      index: true,
    },
    coverageState: {
      type: String,
      default: 'Unknown',
      index: true,
    },
    robotsTxtState: { type: String, default: 'Unknown' },
    indexingState: { type: String, default: 'Unknown' },
    pageFetchState: { type: String, default: 'Unknown' },
    crawledAs: { type: String, default: 'Unknown' },
    lastCrawlTime: { type: Date },
    mobileUsability: { type: String, default: 'UNKNOWN' },
    referringUrls: [{ type: String }],
    lastInspectedAt: { type: Date, default: Date.now, index: true },
    previousVerdict: { type: String },
    previousCoverageState: { type: String },
    inspectionCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

PageCoverageSchema.index({ websiteId: 1, url: 1 }, { unique: true });
PageCoverageSchema.index({ websiteId: 1, verdict: 1 });
PageCoverageSchema.index({ websiteId: 1, coverageState: 1 });
PageCoverageSchema.index({ lastInspectedAt: 1 });

export const PageCoverage: Model<IPageCoverage> =
  mongoose.models.PageCoverage || mongoose.model<IPageCoverage>('PageCoverage', PageCoverageSchema);
