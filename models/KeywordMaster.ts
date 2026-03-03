import mongoose, { Schema, Document, Model } from 'mongoose';

export type KMProvider = 'dataforseo' | 'google' | 'ahrefs' | 'semrush' | 'manual' | 'import';

export interface IKeywordMaster extends Document {
  _id: mongoose.Types.ObjectId;
  keyword: string;
  country: string;       // ISO 2-letter: US, GB, AE
  region?: string;       // optional region/city
  volume: number;        // monthly search volume
  kd: number;            // keyword difficulty 0–100
  cpc: number;           // cost per click USD
  competition: number;   // 0–1
  trend: 'rising' | 'stable' | 'declining';
  provider: KMProvider;
  providerKeywordId?: string; // external ID from provider
  lastRefreshedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KeywordMasterSchema = new Schema<IKeywordMaster>(
  {
    keyword: {
      type: String,
      required: [true, 'Keyword is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      uppercase: true,
      default: 'US',
    },
    region: { type: String, trim: true },
    volume: { type: Number, default: 0, min: 0 },
    kd: { type: Number, default: 0, min: 0, max: 100 },
    cpc: { type: Number, default: 0, min: 0 },
    competition: { type: Number, default: 0, min: 0, max: 1 },
    trend: {
      type: String,
      enum: ['rising', 'stable', 'declining'],
      default: 'stable',
    },
    provider: {
      type: String,
      enum: ['dataforseo', 'google', 'ahrefs', 'semrush', 'manual', 'import'],
      default: 'manual',
    },
    providerKeywordId: { type: String },
    lastRefreshedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Global uniqueness: one keyword per country
KeywordMasterSchema.index({ keyword: 1, country: 1 }, { unique: true });
KeywordMasterSchema.index({ volume: -1, kd: 1 });
KeywordMasterSchema.index({ country: 1, trend: 1 });
KeywordMasterSchema.index({ lastRefreshedAt: -1 });

// Text search
KeywordMasterSchema.index({ keyword: 'text' });

KeywordMasterSchema.set('toJSON', { virtuals: true });
KeywordMasterSchema.set('toObject', { virtuals: true });

export const KeywordMaster: Model<IKeywordMaster> =
  mongoose.models.KeywordMaster ||
  mongoose.model<IKeywordMaster>('KeywordMaster', KeywordMasterSchema);
