import mongoose, { Schema, Document, Model } from 'mongoose';

export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'banned';
export type PartnerTier = 'basic' | 'silver' | 'gold' | 'platinum';

export interface IPartner extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  // Profile
  companyName?: string;
  website?: string;
  bio?: string;
  logo?: string;

  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone?: string;

  // Address
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  // Status
  status: PartnerStatus;
  tier: PartnerTier;

  // Commission
  commissionRate: number; // Percentage (e.g., 70 = 70%)
  customCommissionRate?: number; // Override for specific partners

  // Stripe
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'restricted';
  stripeOnboardingComplete: boolean;

  // Stats
  totalOrders: number;
  totalSpent: number; // in cents
  totalEarnings: number; // in cents (if they're also a publisher)
  averageOrderValue: number;

  // Activity
  lastOrderAt?: Date;
  lastLoginAt?: Date;

  // Preferences
  preferences: {
    emailNotifications: boolean;
    orderUpdates: boolean;
    promotionalEmails: boolean;
    weeklyDigest: boolean;
  };

  // Notes (internal)
  internalNotes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Profile
    companyName: { type: String, trim: true },
    website: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
    logo: { type: String },

    // Contact
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    contactPhone: { type: String, trim: true },

    // Address
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'banned'],
      default: 'pending',
      index: true,
    },
    tier: {
      type: String,
      enum: ['basic', 'silver', 'gold', 'platinum'],
      default: 'basic',
      index: true,
    },

    // Commission
    commissionRate: {
      type: Number,
      default: 70, // 70% to partner, 30% to platform
      min: 0,
      max: 100,
    },
    customCommissionRate: {
      type: Number,
      min: 0,
      max: 100,
    },

    // Stripe
    stripeAccountId: { type: String },
    stripeAccountStatus: {
      type: String,
      enum: ['pending', 'active', 'restricted'],
    },
    stripeOnboardingComplete: { type: Boolean, default: false },

    // Stats
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },

    // Activity
    lastOrderAt: { type: Date },
    lastLoginAt: { type: Date },

    // Preferences
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promotionalEmails: { type: Boolean, default: false },
      weeklyDigest: { type: Boolean, default: true },
    },

    // Notes
    internalNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
PartnerSchema.index({ status: 1, tier: 1 });
PartnerSchema.index({ totalSpent: -1 });
PartnerSchema.index({ createdAt: -1 });

// Virtual to get effective commission rate
PartnerSchema.virtual('effectiveCommissionRate').get(function () {
  return this.customCommissionRate ?? this.commissionRate;
});

// Virtual for user
PartnerSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Update stats method
PartnerSchema.methods.updateStats = async function (orderAmount: number) {
  this.totalOrders += 1;
  this.totalSpent += orderAmount;
  this.averageOrderValue = Math.round(this.totalSpent / this.totalOrders);
  this.lastOrderAt = new Date();

  // Update tier based on total spent
  if (this.totalSpent >= 1000000) { // $10,000+
    this.tier = 'platinum';
  } else if (this.totalSpent >= 500000) { // $5,000+
    this.tier = 'gold';
  } else if (this.totalSpent >= 100000) { // $1,000+
    this.tier = 'silver';
  }

  await this.save();
};

PartnerSchema.set('toJSON', { virtuals: true });
PartnerSchema.set('toObject', { virtuals: true });

export const Partner: Model<IPartner> =
  mongoose.models.Partner || mongoose.model<IPartner>('Partner', PartnerSchema);
