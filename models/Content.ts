import mongoose, { Schema, Document, Model } from 'mongoose';

export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'published' | 'rejected';
export type ContentType = 'blog_post' | 'guest_post' | 'page' | 'landing_page';
export type ContentIntent = 'informational' | 'commercial' | 'affiliate';

export interface IContent extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  keywordId?: mongoose.Types.ObjectId;
  guestPostId?: mongoose.Types.ObjectId;

  // Content
  title: string;
  slug: string;
  excerpt: string;
  body: string; // HTML content

  // Media
  featuredImage: string;
  images: string[];

  // Metadata
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string;

  // Classification
  type: ContentType;
  intent: ContentIntent;
  categoryId: mongoose.Types.ObjectId;
  tags: string[];

  // Author
  authorName: string;
  authorBio?: string;
  authorAvatar?: string;

  // Status
  status: ContentStatus;
  rejectionReason?: string;

  // SEO
  focusKeyword: string;
  secondaryKeywords: string[];
  wordCount: number;
  readingTime: number; // in minutes

  // Schema.org
  schemaMarkup: {
    type: string;
    data: Record<string, unknown>;
  };

  // Internal Linking
  internalLinks: {
    contentId: mongoose.Types.ObjectId;
    anchorText: string;
    url: string;
  }[];
  outboundLinks: {
    url: string;
    anchorText: string;
    isDoFollow: boolean;
  }[];

  // AI Generation
  isAiGenerated: boolean;
  aiModel?: string;
  aiPrompt?: string;

  // Publishing
  publishedAt?: Date;
  scheduledAt?: Date;
  expiresAt?: Date;

  // Analytics
  views: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    keywordId: {
      type: Schema.Types.ObjectId,
      ref: 'Keyword',
      index: true,
    },
    guestPostId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestPost',
    },

    // Content
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      trim: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },
    body: {
      type: String,
      required: [true, 'Body content is required'],
    },

    // Media
    featuredImage: { type: String },
    images: [{ type: String }],

    // Metadata
    metaTitle: {
      type: String,
      maxlength: [70, 'Meta title cannot exceed 70 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },
    canonicalUrl: { type: String },

    // Classification
    type: {
      type: String,
      enum: ['blog_post', 'guest_post', 'page', 'landing_page'],
      default: 'blog_post',
      index: true,
    },
    intent: {
      type: String,
      enum: ['informational', 'commercial', 'affiliate'],
      default: 'informational',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    tags: [{ type: String, trim: true }],

    // Author
    authorName: { type: String, default: 'Admin' },
    authorBio: { type: String },
    authorAvatar: { type: String },

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'scheduled', 'published', 'rejected'],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String },

    // SEO
    focusKeyword: { type: String, index: true },
    secondaryKeywords: [{ type: String }],
    wordCount: { type: Number, default: 0 },
    readingTime: { type: Number, default: 0 },

    // Schema.org
    schemaMarkup: {
      type: { type: String, default: 'Article' },
      data: { type: Schema.Types.Mixed, default: {} },
    },

    // Internal Linking
    internalLinks: [{
      contentId: { type: Schema.Types.ObjectId, ref: 'Content' },
      anchorText: { type: String },
      url: { type: String },
    }],
    outboundLinks: [{
      url: { type: String },
      anchorText: { type: String },
      isDoFollow: { type: Boolean, default: true },
    }],

    // AI Generation
    isAiGenerated: { type: Boolean, default: false },
    aiModel: { type: String },
    aiPrompt: { type: String },

    // Publishing
    publishedAt: { type: Date, index: true },
    scheduledAt: { type: Date, index: true },
    expiresAt: { type: Date, index: true },

    // Analytics
    views: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    avgTimeOnPage: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
ContentSchema.index({ websiteId: 1, slug: 1 }, { unique: true });
ContentSchema.index({ websiteId: 1, status: 1 });
ContentSchema.index({ websiteId: 1, publishedAt: -1 });
ContentSchema.index({ status: 1, scheduledAt: 1 });
ContentSchema.index({ type: 1, status: 1 });

// Text index for search
ContentSchema.index({ title: 'text', excerpt: 'text', tags: 'text' });

// Pre-save hook to calculate word count and reading time
ContentSchema.pre('save', function (next) {
  if (this.isModified('body')) {
    const text = this.body.replace(/<[^>]*>/g, ''); // Strip HTML
    const words = text.split(/\s+/).filter(Boolean);
    this.wordCount = words.length;
    this.readingTime = Math.ceil(this.wordCount / 200); // ~200 words per minute
  }
  next();
});

// Virtuals
ContentSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

ContentSchema.virtual('keyword', {
  ref: 'Keyword',
  localField: 'keywordId',
  foreignField: '_id',
  justOne: true,
});

ContentSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true,
});

ContentSchema.set('toJSON', { virtuals: true });
ContentSchema.set('toObject', { virtuals: true });

export const Content: Model<IContent> =
  mongoose.models.Content || mongoose.model<IContent>('Content', ContentSchema);
