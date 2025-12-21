import mongoose, { Schema, Document, Model } from 'mongoose';

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled' | 'on_hold';
export type CommissionType = 'guest_post_sale' | 'referral' | 'bonus';
export type PayoutMethod = 'stripe' | 'paypal' | 'bank_transfer' | 'crypto';

export interface ICommission extends Document {
  _id: mongoose.Types.ObjectId;

  // Related entities
  partnerId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  guestPostId?: mongoose.Types.ObjectId;
  websiteId?: mongoose.Types.ObjectId;

  // Type
  type: CommissionType;
  description: string;

  // Amounts
  orderAmount: number; // Original order amount in cents
  commissionRate: number; // Percentage
  commissionAmount: number; // Calculated commission in cents
  platformFee: number; // Platform's share in cents
  currency: string;

  // Status
  status: CommissionStatus;
  statusHistory: {
    status: CommissionStatus;
    changedAt: Date;
    changedBy?: mongoose.Types.ObjectId;
    reason?: string;
  }[];

  // Payout
  payoutId?: mongoose.Types.ObjectId;
  payoutMethod?: PayoutMethod;
  paidAt?: Date;

  // Hold
  holdReason?: string;
  holdUntil?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
}

const CommissionSchema = new Schema<ICommission>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    guestPostId: {
      type: Schema.Types.ObjectId,
      ref: 'GuestPost',
    },
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      index: true,
    },

    // Type
    type: {
      type: String,
      enum: ['guest_post_sale', 'referral', 'bonus'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },

    // Amounts
    orderAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled', 'on_hold'],
      default: 'pending',
      index: true,
    },
    statusHistory: [{
      status: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'cancelled', 'on_hold'],
      },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
    }],

    // Payout
    payoutId: {
      type: Schema.Types.ObjectId,
      ref: 'Payout',
    },
    payoutMethod: {
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer', 'crypto'],
    },
    paidAt: { type: Date },

    // Hold
    holdReason: { type: String },
    holdUntil: { type: Date },

    // Timestamps
    approvedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
CommissionSchema.index({ partnerId: 1, status: 1 });
CommissionSchema.index({ partnerId: 1, createdAt: -1 });
CommissionSchema.index({ status: 1, createdAt: -1 });
CommissionSchema.index({ payoutId: 1 });

// Pre-save hook to update status history
CommissionSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });

    if (this.status === 'approved') {
      this.approvedAt = new Date();
    } else if (this.status === 'paid') {
      this.paidAt = new Date();
    }
  }
  next();
});

// Virtuals
CommissionSchema.virtual('partner', {
  ref: 'Partner',
  localField: 'partnerId',
  foreignField: '_id',
  justOne: true,
});

CommissionSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true,
});

CommissionSchema.set('toJSON', { virtuals: true });
CommissionSchema.set('toObject', { virtuals: true });

export const Commission: Model<ICommission> =
  mongoose.models.Commission || mongoose.model<ICommission>('Commission', CommissionSchema);

// Payout Model for batch payouts
export interface IPayout extends Document {
  _id: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;

  // Amounts
  totalAmount: number;
  currency: string;

  // Commissions included
  commissionIds: mongoose.Types.ObjectId[];
  commissionCount: number;

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';

  // Payment details
  payoutMethod: PayoutMethod;
  stripeTransferId?: string;
  paypalPayoutId?: string;
  transactionReference?: string;

  // Failure
  failureReason?: string;
  retryCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    commissionIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Commission',
    }],
    commissionCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    payoutMethod: {
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer', 'crypto'],
      required: true,
    },
    stripeTransferId: { type: String },
    paypalPayoutId: { type: String },
    transactionReference: { type: String },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },
    processedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

PayoutSchema.index({ partnerId: 1, status: 1 });
PayoutSchema.index({ status: 1, createdAt: -1 });

export const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>('Payout', PayoutSchema);
