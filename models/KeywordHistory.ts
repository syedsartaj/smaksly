import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Append-only daily keyword ranking history.
 * Records are NEVER overwritten — only new documents are inserted.
 * One document per (keywordMasterId + websiteId + date).
 */
export interface IKeywordHistory extends Document {
  _id: mongoose.Types.ObjectId;
  keywordMasterId: mongoose.Types.ObjectId; // ref → KeywordMaster
  websiteId: mongoose.Types.ObjectId;       // ref → Website
  keyword: string;                           // denormalised for fast queries
  country: string;
  date: Date;                                // truncated to day (UTC midnight)

  // Ranking data for this day
  rank: number | null;          // null = not ranking / not in top 100
  previousRank: number | null;  // rank from previous recorded day
  rankChange: number | null;    // positive = improved, negative = dropped

  // Traffic data from GSC (for this keyword on this website)
  clicks: number;
  impressions: number;
  ctr: number;    // 0–100 percentage
  position: number; // GSC average position (may differ from SERP rank)

  // Snapshot of metrics on this day
  volume: number;
  kd: number;
  provider: string;

  createdAt: Date;
}

const KeywordHistorySchema = new Schema<IKeywordHistory>(
  {
    keywordMasterId: {
      type: Schema.Types.ObjectId,
      ref: 'KeywordMaster',
      required: true,
      index: true,
    },
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    keyword: { type: String, required: true, trim: true, lowercase: true },
    country: { type: String, required: true, uppercase: true, default: 'US' },
    date: { type: Date, required: true, index: true },

    rank: { type: Number, default: null },
    previousRank: { type: Number, default: null },
    rankChange: { type: Number, default: null },

    clicks: { type: Number, default: 0, min: 0 },
    impressions: { type: Number, default: 0, min: 0 },
    ctr: { type: Number, default: 0, min: 0 },
    position: { type: Number, default: 0, min: 0 },

    volume: { type: Number, default: 0, min: 0 },
    kd: { type: Number, default: 0, min: 0, max: 100 },
    provider: { type: String, default: 'gsc' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // append-only: no updatedAt
  }
);

// Primary uniqueness: one record per keyword per website per day
KeywordHistorySchema.index(
  { keywordMasterId: 1, websiteId: 1, date: -1 },
  { unique: true }
);

// Query patterns
KeywordHistorySchema.index({ websiteId: 1, date: -1 });
KeywordHistorySchema.index({ keywordMasterId: 1, date: -1 });
KeywordHistorySchema.index({ websiteId: 1, keyword: 1, date: -1 });
KeywordHistorySchema.index({ websiteId: 1, rank: 1, date: -1 });

// Virtuals
KeywordHistorySchema.virtual('keywordMaster', {
  ref: 'KeywordMaster',
  localField: 'keywordMasterId',
  foreignField: '_id',
  justOne: true,
});

KeywordHistorySchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

KeywordHistorySchema.set('toJSON', { virtuals: true });
KeywordHistorySchema.set('toObject', { virtuals: true });

export const KeywordHistory: Model<IKeywordHistory> =
  mongoose.models.KeywordHistory ||
  mongoose.model<IKeywordHistory>('KeywordHistory', KeywordHistorySchema);
