import mongoose, { Schema, Document, Model } from 'mongoose';

export type IssueType = 'ranking_drop' | 'speed_issue' | 'seo_issue' | 'content_issue' | 'indexing_issue' | 'broken_link';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'fixing' | 'fixed' | 'ignored' | 'wont_fix';

export interface IIssue extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  contentId?: mongoose.Types.ObjectId;
  healthReportId?: mongoose.Types.ObjectId;
  type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  title: string;
  description: string;
  details: Record<string, unknown>;
  suggestion: string;
  autoFixable: boolean;
  fixType?: string;
  fixAppliedAt?: Date;
  fixResult?: { success: boolean; message: string; changes?: Record<string, unknown> };
  detectedAt: Date;
  resolvedAt?: Date;
  ignoredAt?: Date;
  ignoredReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema = new Schema<IIssue>(
  {
    websiteId: { type: Schema.Types.ObjectId, ref: 'Website', required: true, index: true },
    contentId: { type: Schema.Types.ObjectId, ref: 'Content', index: true },
    healthReportId: { type: Schema.Types.ObjectId, ref: 'HealthReport' },
    type: {
      type: String,
      enum: ['ranking_drop', 'speed_issue', 'seo_issue', 'content_issue', 'indexing_issue', 'broken_link'],
      required: true, index: true,
    },
    severity: {
      type: String, enum: ['low', 'medium', 'high', 'critical'], required: true, index: true,
    },
    status: {
      type: String, enum: ['open', 'fixing', 'fixed', 'ignored', 'wont_fix'], default: 'open', index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    suggestion: { type: String, default: '' },
    autoFixable: { type: Boolean, default: false },
    fixType: {
      type: String,
      enum: ['regenerate_article', 'update_meta', 'compress_images', 'fix_broken_link', 'resubmit_indexing', 'optimize_content', 'add_internal_links', 'manual'],
    },
    fixAppliedAt: { type: Date },
    fixResult: {
      success: { type: Boolean },
      message: { type: String },
      changes: { type: Schema.Types.Mixed },
    },
    detectedAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date },
    ignoredAt: { type: Date },
    ignoredReason: { type: String },
  },
  { timestamps: true }
);

IssueSchema.index({ websiteId: 1, status: 1, severity: -1 });
IssueSchema.index({ websiteId: 1, type: 1, status: 1 });
IssueSchema.index({ status: 1, autoFixable: 1 });
IssueSchema.index({ websiteId: 1, detectedAt: -1 });

IssueSchema.virtual('website', { ref: 'Website', localField: 'websiteId', foreignField: '_id', justOne: true });
IssueSchema.virtual('content', { ref: 'Content', localField: 'contentId', foreignField: '_id', justOne: true });

IssueSchema.set('toJSON', { virtuals: true });
IssueSchema.set('toObject', { virtuals: true });

export const Issue: Model<IIssue> =
  mongoose.models.Issue || mongoose.model<IIssue>('Issue', IssueSchema);
