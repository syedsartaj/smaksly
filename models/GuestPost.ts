import mongoose, { Schema, Document, Model } from 'mongoose';

export type GuestPostStatus =
  | 'pending_payment'
  | 'paid'
  | 'content_pending'
  | 'content_submitted'
  | 'under_review'
  | 'revision_requested'
  | 'approved'
  | 'published'
  | 'expired'
  | 'rejected'
  | 'refunded';

export interface IGuestPost extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  contentId?: mongoose.Types.ObjectId;

  // Status
  status: GuestPostStatus;
  statusHistory: {
    status: GuestPostStatus;
    changedAt: Date;
    changedBy?: mongoose.Types.ObjectId;
    reason?: string;
  }[];

  // Content Details
  title?: string;
  content?: string;
  submittedContent?: string; // Original submitted content

  // Links
  targetUrl: string;
  anchorText: string;
  isDoFollow: boolean;
  additionalLinks: {
    url: string;
    anchorText: string;
    isDoFollow: boolean;
  }[];

  // Pricing
  price: number; // in cents
  currency: string;

  // Expiry
  hasExpiry: boolean;
  expiryDays?: number;
  expiresAt?: Date;
  expiryNotificationSent: boolean;
  expiryAction: 'remove' | 'nofollow' | 'keep';

  // Publishing
  publishedUrl?: string;
  publishedAt?: Date;

  // Review
  reviewNotes?: string;
  revisionCount: number;
  maxRevisions: number;

  // Communication
  messages: {
    senderId: mongoose.Types.ObjectId;
    senderRole: 'admin' | 'partner';
    message: string;
    sentAt: Date;
    isRead: boolean;
  }[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  contentSubmittedAt?: Date;
  approvedAt?: Date;
}

const GuestPostSchema = new Schema<IGuestPost>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
    },

    // Status
    status: {
      type: String,
      enum: [
        'pending_payment',
        'paid',
        'content_pending',
        'content_submitted',
        'under_review',
        'revision_requested',
        'approved',
        'published',
        'expired',
        'rejected',
        'refunded',
      ],
      default: 'pending_payment',
      index: true,
    },
    statusHistory: [{
      status: {
        type: String,
        enum: [
          'pending_payment',
          'paid',
          'content_pending',
          'content_submitted',
          'under_review',
          'revision_requested',
          'approved',
          'published',
          'expired',
          'rejected',
          'refunded',
        ],
      },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
    }],

    // Content Details
    title: { type: String, trim: true },
    content: { type: String },
    submittedContent: { type: String },

    // Links
    targetUrl: {
      type: String,
      required: [true, 'Target URL is required'],
    },
    anchorText: {
      type: String,
      required: [true, 'Anchor text is required'],
      trim: true,
    },
    isDoFollow: {
      type: Boolean,
      default: true,
    },
    additionalLinks: [{
      url: { type: String },
      anchorText: { type: String },
      isDoFollow: { type: Boolean, default: false },
    }],

    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },

    // Expiry
    hasExpiry: {
      type: Boolean,
      default: false,
    },
    expiryDays: {
      type: Number,
      min: 1,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    expiryNotificationSent: {
      type: Boolean,
      default: false,
    },
    expiryAction: {
      type: String,
      enum: ['remove', 'nofollow', 'keep'],
      default: 'nofollow',
    },

    // Publishing
    publishedUrl: { type: String },
    publishedAt: { type: Date, index: true },

    // Review
    reviewNotes: { type: String },
    revisionCount: { type: Number, default: 0 },
    maxRevisions: { type: Number, default: 2 },

    // Communication
    messages: [{
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      senderRole: { type: String, enum: ['admin', 'partner'] },
      message: { type: String },
      sentAt: { type: Date, default: Date.now },
      isRead: { type: Boolean, default: false },
    }],

    // Timestamps
    contentSubmittedAt: { type: Date },
    approvedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
GuestPostSchema.index({ partnerId: 1, status: 1 });
GuestPostSchema.index({ websiteId: 1, status: 1 });
GuestPostSchema.index({ status: 1, expiresAt: 1 });
GuestPostSchema.index({ orderId: 1, websiteId: 1 });
GuestPostSchema.index({ hasExpiry: 1, expiresAt: 1, expiryNotificationSent: 1 });

// Pre-save hook to update status history
GuestPostSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  }
  next();
});

// Virtuals
GuestPostSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true,
});

GuestPostSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

GuestPostSchema.virtual('partner', {
  ref: 'Partner',
  localField: 'partnerId',
  foreignField: '_id',
  justOne: true,
});

GuestPostSchema.set('toJSON', { virtuals: true });
GuestPostSchema.set('toObject', { virtuals: true });

export const GuestPost: Model<IGuestPost> =
  mongoose.models.GuestPost || mongoose.model<IGuestPost>('GuestPost', GuestPostSchema);
