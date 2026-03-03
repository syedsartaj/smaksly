import mongoose, { Schema, Document, Model } from 'mongoose';

export type UptimeStatus = 'up' | 'down' | 'degraded' | 'timeout' | 'error';

export interface IUptimeLog extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  url: string;                 // full URL that was pinged
  statusCode: number | null;   // HTTP status code, null on timeout/error
  latencyMs: number | null;    // response time in ms, null on error
  isUp: boolean;               // statusCode 2xx/3xx = true
  status: UptimeStatus;
  errorMessage?: string;       // error details if failed
  checkedAt: Date;

  createdAt: Date;
}

const UptimeLogSchema = new Schema<IUptimeLog>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    url: { type: String, required: true },
    statusCode: { type: Number, default: null },
    latencyMs: { type: Number, default: null },
    isUp: { type: Boolean, required: true, default: true },
    status: {
      type: String,
      enum: ['up', 'down', 'degraded', 'timeout', 'error'],
      required: true,
      default: 'up',
    },
    errorMessage: { type: String },
    checkedAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // append-only
  }
);

// Indexes
UptimeLogSchema.index({ websiteId: 1, checkedAt: -1 });
UptimeLogSchema.index({ websiteId: 1, isUp: 1, checkedAt: -1 });
UptimeLogSchema.index({ checkedAt: -1 }); // for TTL or cleanup queries

// Auto-expire logs older than 90 days
UptimeLogSchema.index({ checkedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// Virtuals
UptimeLogSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

UptimeLogSchema.set('toJSON', { virtuals: true });
UptimeLogSchema.set('toObject', { virtuals: true });

export const UptimeLog: Model<IUptimeLog> =
  mongoose.models.UptimeLog ||
  mongoose.model<IUptimeLog>('UptimeLog', UptimeLogSchema);
