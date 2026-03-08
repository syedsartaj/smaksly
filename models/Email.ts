import mongoose, { Schema, Document, Model } from 'mongoose';

export type EmailDirection = 'inbound' | 'outbound';
export type EmailFolder = 'inbox' | 'sent' | 'trash' | 'draft';

export interface IEmailContact {
  name?: string;
  address: string;
}

export interface IEmail extends Document {
  _id: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  messageId: string; // RFC Message-ID
  threadId: string; // grouped by In-Reply-To / References
  from: IEmailContact;
  to: IEmailContact[];
  cc: IEmailContact[];
  subject: string;
  snippet: string; // first 200 chars for list view
  body: string; // full HTML
  bodyText: string; // plain text fallback
  direction: EmailDirection;
  isRead: boolean;
  isStarred: boolean;
  folder: EmailFolder;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailContactSchema = new Schema<IEmailContact>(
  {
    name: { type: String, default: '' },
    address: { type: String, required: true, lowercase: true },
  },
  { _id: false }
);

const EmailSchema = new Schema<IEmail>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'EmailAccount', required: true, index: true },
    messageId: { type: String, required: true },
    threadId: { type: String, required: true, index: true },
    from: { type: EmailContactSchema, required: true },
    to: { type: [EmailContactSchema], default: [] },
    cc: { type: [EmailContactSchema], default: [] },
    subject: { type: String, default: '(no subject)' },
    snippet: { type: String, default: '' },
    body: { type: String, default: '' },
    bodyText: { type: String, default: '' },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    isRead: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },
    folder: { type: String, enum: ['inbox', 'sent', 'trash', 'draft'], default: 'inbox' },
    receivedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Compound indexes for common queries
EmailSchema.index({ accountId: 1, folder: 1, receivedAt: -1 });
EmailSchema.index({ accountId: 1, isRead: 1 });
EmailSchema.index({ messageId: 1 }, { unique: true });
EmailSchema.index({ accountId: 1, subject: 'text', snippet: 'text' });

export const Email: Model<IEmail> =
  mongoose.models.Email || mongoose.model<IEmail>('Email', EmailSchema);
