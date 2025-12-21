import mongoose, { Schema, Document, Model } from 'mongoose';

export type KeywordIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type KeywordStatus = 'discovered' | 'assigned' | 'content_created' | 'published' | 'rejected';
export type KeywordSource = 'manual' | 'ai_research' | 'gsc' | 'competitor' | 'import';

export interface IKeyword extends Document {
  _id: mongoose.Types.ObjectId;
  keyword: string;

  // Assignment
  websiteId?: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  contentId?: mongoose.Types.ObjectId;

  // Metrics
  volume: number; // Monthly search volume
  difficulty: number; // 0-100
  cpc: number; // Cost per click in USD
  competition: number; // 0-1
  trend: 'rising' | 'stable' | 'declining';

  // Classification
  intent: KeywordIntent;
  isLongTail: boolean;
  wordCount: number;

  // Status
  status: KeywordStatus;
  source: KeywordSource;

  // Related Keywords
  parentKeywordId?: mongoose.Types.ObjectId;
  relatedKeywords: string[];

  // SERP Analysis
  serpFeatures: string[]; // featured_snippet, people_also_ask, etc.
  topCompetitors: {
    domain: string;
    position: number;
    url: string;
  }[];

  // Network Duplicate Check
  isDuplicateInNetwork: boolean;
  duplicateWebsiteIds: mongoose.Types.ObjectId[];

  // Timestamps
  discoveredAt: Date;
  assignedAt?: Date;
  publishedAt?: Date;
  lastUpdatedMetricsAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const KeywordSchema = new Schema<IKeyword>(
  {
    keyword: {
      type: String,
      required: [true, 'Keyword is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
    },

    // Metrics
    volume: { type: Number, default: 0, min: 0, index: true },
    difficulty: { type: Number, default: 0, min: 0, max: 100, index: true },
    cpc: { type: Number, default: 0, min: 0 },
    competition: { type: Number, default: 0, min: 0, max: 1 },
    trend: {
      type: String,
      enum: ['rising', 'stable', 'declining'],
      default: 'stable',
    },

    // Classification
    intent: {
      type: String,
      enum: ['informational', 'commercial', 'transactional', 'navigational'],
      required: true,
      index: true,
    },
    isLongTail: { type: Boolean, default: false },
    wordCount: { type: Number, default: 1 },

    // Status
    status: {
      type: String,
      enum: ['discovered', 'assigned', 'content_created', 'published', 'rejected'],
      default: 'discovered',
      index: true,
    },
    source: {
      type: String,
      enum: ['manual', 'ai_research', 'gsc', 'competitor', 'import'],
      default: 'ai_research',
    },

    // Related Keywords
    parentKeywordId: {
      type: Schema.Types.ObjectId,
      ref: 'Keyword',
    },
    relatedKeywords: [{ type: String }],

    // SERP Analysis
    serpFeatures: [{ type: String }],
    topCompetitors: [{
      domain: { type: String },
      position: { type: Number },
      url: { type: String },
    }],

    // Network Duplicate Check
    isDuplicateInNetwork: { type: Boolean, default: false },
    duplicateWebsiteIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Website',
    }],

    // Timestamps
    discoveredAt: { type: Date, default: Date.now },
    assignedAt: { type: Date },
    publishedAt: { type: Date },
    lastUpdatedMetricsAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
KeywordSchema.index({ keyword: 1, websiteId: 1 }, { unique: true, sparse: true });
KeywordSchema.index({ categoryId: 1, status: 1 });
KeywordSchema.index({ websiteId: 1, status: 1 });
KeywordSchema.index({ intent: 1, difficulty: 1 });
KeywordSchema.index({ volume: -1, difficulty: 1 });
KeywordSchema.index({ status: 1, discoveredAt: -1 });

// Text index for search
KeywordSchema.index({ keyword: 'text', relatedKeywords: 'text' });

// Virtuals
KeywordSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

KeywordSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true,
});

KeywordSchema.virtual('content', {
  ref: 'Content',
  localField: 'contentId',
  foreignField: '_id',
  justOne: true,
});

KeywordSchema.set('toJSON', { virtuals: true });
KeywordSchema.set('toObject', { virtuals: true });

export const Keyword: Model<IKeyword> =
  mongoose.models.Keyword || mongoose.model<IKeyword>('Keyword', KeywordSchema);
