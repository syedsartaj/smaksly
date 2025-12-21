import mongoose, { Schema, Document, Model } from 'mongoose';

export type WebsiteStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface IWebsite extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  domain: string;
  customDomain?: string;

  // Categorization
  niche: string;
  categoryId: mongoose.Types.ObjectId;
  tags: string[];
  description: string;

  // Status
  status: WebsiteStatus;

  // SEO Metrics
  da: number; // Domain Authority (Moz)
  dr: number; // Domain Rating (Ahrefs)
  traffic: number; // Monthly organic traffic
  organicKeywords: number;
  referringDomains: number;
  spamScore: number;

  // Guest Post Settings
  acceptsGuestPosts: boolean;
  guestPostPrice: number; // in cents
  featuredPostPrice?: number; // premium pricing
  doFollow: boolean;
  turnaroundDays: number;
  maxLinksPerPost: number;
  minWordCount: number;
  maxWordCount: number;
  contentGuidelines: string;
  prohibitedTopics: string[];

  // Publishing Settings
  autoPublish: boolean;
  dailyPostLimit: number;
  weeklyPostLimit: number;
  requireApproval: boolean;

  // Deployment
  vercelId?: string;
  vercelProjectName?: string;
  gitRepo?: string;

  // GSC & Analytics
  gscPropertyUrl?: string;
  gscConnected: boolean;
  gaPropertyId?: string;
  gaConnected: boolean;

  // Theme & Design
  themeConfig: {
    header: string;
    hero: string;
    footer: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    blogLayout: string;
  };

  // Metadata
  country: string;
  language: string;
  currency: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastSeoSyncAt?: Date;
  lastContentPublishedAt?: Date;
}

const WebsiteSchema = new Schema<IWebsite>(
  {
    name: {
      type: String,
      required: [true, 'Website name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customDomain: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    niche: {
      type: String,
      required: [true, 'Niche is required'],
      trim: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended'],
      default: 'pending',
      index: true,
    },

    // SEO Metrics
    da: { type: Number, default: 0, min: 0, max: 100, index: true },
    dr: { type: Number, default: 0, min: 0, max: 100, index: true },
    traffic: { type: Number, default: 0, min: 0, index: true },
    organicKeywords: { type: Number, default: 0, min: 0 },
    referringDomains: { type: Number, default: 0, min: 0 },
    spamScore: { type: Number, default: 0, min: 0, max: 100 },

    // Guest Post Settings
    acceptsGuestPosts: { type: Boolean, default: false, index: true },
    guestPostPrice: { type: Number, default: 0, min: 0, index: true },
    featuredPostPrice: { type: Number, min: 0 },
    doFollow: { type: Boolean, default: true, index: true },
    turnaroundDays: { type: Number, default: 7, min: 1, index: true },
    maxLinksPerPost: { type: Number, default: 2, min: 1, max: 10 },
    minWordCount: { type: Number, default: 500, min: 100 },
    maxWordCount: { type: Number, default: 2000, max: 10000 },
    contentGuidelines: { type: String, default: '' },
    prohibitedTopics: [{ type: String }],

    // Publishing Settings
    autoPublish: { type: Boolean, default: false },
    dailyPostLimit: { type: Number, default: 5, min: 1 },
    weeklyPostLimit: { type: Number, default: 20, min: 1 },
    requireApproval: { type: Boolean, default: true },

    // Deployment
    vercelId: { type: String },
    vercelProjectName: { type: String },
    gitRepo: { type: String },

    // GSC & Analytics
    gscPropertyUrl: { type: String },
    gscConnected: { type: Boolean, default: false },
    gaPropertyId: { type: String },
    gaConnected: { type: Boolean, default: false },

    // Theme & Design
    themeConfig: {
      header: { type: String, default: 'Header1' },
      hero: { type: String, default: 'Hero1' },
      footer: { type: String, default: 'Footer1' },
      primaryColor: { type: String, default: '#10b981' },
      secondaryColor: { type: String, default: '#06b6d4' },
      fontFamily: { type: String, default: 'Inter' },
      blogLayout: { type: String, default: 'BlogLayout1' },
    },

    // Metadata
    country: { type: String, default: 'US', index: true },
    language: { type: String, default: 'en', index: true },
    currency: { type: String, default: 'USD' },

    // Timestamps
    lastSeoSyncAt: { type: Date },
    lastContentPublishedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
WebsiteSchema.index({ status: 1, acceptsGuestPosts: 1 });
WebsiteSchema.index({ niche: 1, da: -1 });
WebsiteSchema.index({ categoryId: 1, traffic: -1 });
WebsiteSchema.index({ acceptsGuestPosts: 1, guestPostPrice: 1, da: -1 });
WebsiteSchema.index({ country: 1, language: 1 });

// Text index for search
WebsiteSchema.index({ name: 'text', domain: 'text', description: 'text', tags: 'text' });

// Virtual for category
WebsiteSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true,
});

WebsiteSchema.set('toJSON', { virtuals: true });
WebsiteSchema.set('toObject', { virtuals: true });

export const Website: Model<IWebsite> =
  mongoose.models.Website || mongoose.model<IWebsite>('Website', WebsiteSchema);
