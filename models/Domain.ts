import mongoose, { Schema, Document, Model } from 'mongoose';

export type DomainStatus = 'pending' | 'active' | 'expired' | 'transferred' | 'suspended';
export type DnsStatus = 'pending' | 'configured' | 'error' | 'propagating';
export type SslStatus = 'pending' | 'active' | 'expired' | 'error';

export interface IDomain extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;

  // Domain Info
  domain: string;
  isPrimary: boolean;
  isCustom: boolean; // vs auto-generated subdomain

  // Status
  status: DomainStatus;
  dnsStatus: DnsStatus;
  sslStatus: SslStatus;

  // DNS Records
  dnsRecords: {
    type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';
    name: string;
    value: string;
    ttl: number;
    verified: boolean;
  }[];

  // Verification
  verificationToken?: string;
  verificationMethod?: 'dns' | 'file' | 'meta';
  verifiedAt?: Date;

  // SSL
  sslProvider?: string;
  sslExpiresAt?: Date;
  autoRenewSsl: boolean;

  // Redirects
  redirects: {
    from: string;
    to: string;
    type: '301' | '302';
    isActive: boolean;
  }[];

  // Registrar Info (if managed)
  registrar?: string;
  registrationDate?: Date;
  expirationDate?: Date;
  autoRenew: boolean;

  // Vercel
  vercelDomainId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt?: Date;
}

const DomainSchema = new Schema<IDomain>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'transferred', 'suspended'],
      default: 'pending',
      index: true,
    },
    dnsStatus: {
      type: String,
      enum: ['pending', 'configured', 'error', 'propagating'],
      default: 'pending',
    },
    sslStatus: {
      type: String,
      enum: ['pending', 'active', 'expired', 'error'],
      default: 'pending',
    },
    dnsRecords: [{
      type: {
        type: String,
        enum: ['A', 'AAAA', 'CNAME', 'TXT', 'MX'],
        required: true,
      },
      name: { type: String, required: true },
      value: { type: String, required: true },
      ttl: { type: Number, default: 3600 },
      verified: { type: Boolean, default: false },
    }],
    verificationToken: { type: String },
    verificationMethod: {
      type: String,
      enum: ['dns', 'file', 'meta'],
    },
    verifiedAt: { type: Date },
    sslProvider: { type: String },
    sslExpiresAt: { type: Date },
    autoRenewSsl: { type: Boolean, default: true },
    redirects: [{
      from: { type: String, required: true },
      to: { type: String, required: true },
      type: { type: String, enum: ['301', '302'], default: '301' },
      isActive: { type: Boolean, default: true },
    }],
    registrar: { type: String },
    registrationDate: { type: Date },
    expirationDate: { type: Date, index: true },
    autoRenew: { type: Boolean, default: false },
    vercelDomainId: { type: String },
    lastCheckedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
DomainSchema.index({ websiteId: 1, isPrimary: 1 });
DomainSchema.index({ status: 1, expirationDate: 1 });
DomainSchema.index({ sslStatus: 1, sslExpiresAt: 1 });

// Virtual for website
DomainSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

DomainSchema.set('toJSON', { virtuals: true });
DomainSchema.set('toObject', { virtuals: true });

export const Domain: Model<IDomain> =
  mongoose.models.Domain || mongoose.model<IDomain>('Domain', DomainSchema);
