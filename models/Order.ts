import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface IOrderItem {
  websiteId: mongoose.Types.ObjectId;
  websiteName: string;
  websiteDomain: string;
  guestPostId?: mongoose.Types.ObjectId;
  price: number; // in cents
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  partnerId: mongoose.Types.ObjectId;

  // Items
  items: IOrderItem[];

  // Pricing
  subtotal: number; // in cents
  discount: number;
  discountCode?: string;
  tax: number;
  total: number;
  currency: string;

  // Commission
  platformFee: number; // Platform's share
  partnerPayout: number; // What partner receives (if publisher)

  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;

  // Payment
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  paymentMethod?: string;
  paidAt?: Date;

  // Refund
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;

  // Notes
  customerNotes?: string;
  internalNotes?: string;

  // Metadata
  ipAddress?: string;
  userAgent?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const OrderItemSchema = new Schema({
  websiteId: {
    type: Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
  },
  websiteName: { type: String, required: true },
  websiteDomain: { type: String, required: true },
  guestPostId: {
    type: Schema.Types.ObjectId,
    ref: 'GuestPost',
  },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'refunded'],
    default: 'pending',
  },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true,
    },

    // Items
    items: [OrderItemSchema],

    // Pricing
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountCode: { type: String },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },

    // Commission
    platformFee: { type: Number, default: 0, min: 0 },
    partnerPayout: { type: Number, default: 0, min: 0 },

    // Status
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'paid',
        'partially_fulfilled',
        'fulfilled',
        'cancelled',
        'refunded',
        'partially_refunded',
      ],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },

    // Payment
    stripePaymentIntentId: { type: String, index: true },
    stripeSessionId: { type: String },
    paymentMethod: { type: String },
    paidAt: { type: Date },

    // Refund
    refundAmount: { type: Number },
    refundReason: { type: String },
    refundedAt: { type: Date },

    // Notes
    customerNotes: { type: String },
    internalNotes: { type: String },

    // Metadata
    ipAddress: { type: String },
    userAgent: { type: String },

    // Timestamps
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
OrderSchema.index({ partnerId: 1, status: 1 });
OrderSchema.index({ partnerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });

// Generate order number before save
OrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderNumber = `ORD-${year}${month}-${random}`;
  }
  next();
});

// Virtual for partner
OrderSchema.virtual('partner', {
  ref: 'Partner',
  localField: 'partnerId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for item count
OrderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Method to calculate fulfillment status
OrderSchema.methods.updateFulfillmentStatus = function () {
  const completedItems = this.items.filter((item: IOrderItem) => item.status === 'completed').length;
  const totalItems = this.items.length;

  if (completedItems === 0) {
    this.status = 'paid';
  } else if (completedItems === totalItems) {
    this.status = 'fulfilled';
    this.completedAt = new Date();
  } else {
    this.status = 'partially_fulfilled';
  }
};

OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
