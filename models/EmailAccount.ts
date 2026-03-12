import mongoose, { Schema, Document, Model } from 'mongoose';

export type EmailAccountStatus = 'active' | 'error' | 'disabled';

export interface IEmailAccount extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  email: string;
  displayName: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  passwordEncrypted: string; // AES-256-GCM encrypted
  passwordIv: string;
  passwordTag: string;
  // Separate SMTP credentials (optional — if different from IMAP)
  smtpUsername?: string;
  smtpPasswordEncrypted?: string;
  smtpPasswordIv?: string;
  smtpPasswordTag?: string;
  lastSyncAt: Date | null;
  status: EmailAccountStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailAccountSchema = new Schema<IEmailAccount>(
  {
    websiteId: { type: Schema.Types.ObjectId, ref: 'Website', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, default: '' },
    imapHost: { type: String, required: true },
    imapPort: { type: Number, default: 993 },
    smtpHost: { type: String, required: true },
    smtpPort: { type: Number, default: 587 },
    username: { type: String, required: true },
    passwordEncrypted: { type: String, required: true },
    passwordIv: { type: String, required: true },
    passwordTag: { type: String, required: true },
    smtpUsername: { type: String },
    smtpPasswordEncrypted: { type: String },
    smtpPasswordIv: { type: String },
    smtpPasswordTag: { type: String },
    lastSyncAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'error', 'disabled'], default: 'active' },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

EmailAccountSchema.index({ websiteId: 1, email: 1 }, { unique: true });

export const EmailAccount: Model<IEmailAccount> =
  mongoose.models.EmailAccount || mongoose.model<IEmailAccount>('EmailAccount', EmailAccountSchema);
