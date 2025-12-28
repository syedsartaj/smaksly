import mongoose, { Schema, Document, Model } from 'mongoose';

export type BuilderPageType = 'static' | 'dynamic' | 'blog-listing' | 'blog-post';
export type BuilderPageStatus = 'draft' | 'generated' | 'edited' | 'published';

export interface IAIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IPageVersion {
  code: string;
  createdAt: Date;
  prompt?: string;
  description?: string;
}

export interface IBuilderPage extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;

  // Page Info
  name: string;
  path: string;
  type: BuilderPageType;
  isHomePage: boolean;

  // Generated Code
  code: string;
  cssModules?: string;

  // AI Context
  aiPrompt: string;
  aiConversation: IAIConversationMessage[];

  // SEO Metadata
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;

  // Status
  status: BuilderPageStatus;
  lastGeneratedAt?: Date;

  // Version History (keep last 10 versions)
  versions: IPageVersion[];

  // Order for navigation
  order: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AIConversationMessageSchema = new Schema<IAIConversationMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const PageVersionSchema = new Schema<IPageVersion>(
  {
    code: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    prompt: { type: String },
    description: { type: String },
  },
  { _id: false }
);

const BuilderPageSchema = new Schema<IBuilderPage>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'BuilderProject',
      required: [true, 'Project ID is required'],
      index: true,
    },

    // Page Info
    name: {
      type: String,
      required: [true, 'Page name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    path: {
      type: String,
      required: [true, 'Path is required'],
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^\/[a-z0-9\-\/\[\]]*$/i.test(v) || v === '/';
        },
        message: 'Path must start with / and contain only letters, numbers, hyphens, brackets',
      },
    },
    type: {
      type: String,
      enum: ['static', 'dynamic', 'blog-listing', 'blog-post'],
      default: 'static',
    },
    isHomePage: {
      type: Boolean,
      default: false,
    },

    // Generated Code
    code: {
      type: String,
      default: '',
    },
    cssModules: {
      type: String,
    },

    // AI Context
    aiPrompt: {
      type: String,
      default: '',
    },
    aiConversation: {
      type: [AIConversationMessageSchema],
      default: [],
    },

    // SEO Metadata
    metaTitle: {
      type: String,
      maxlength: [70, 'Meta title cannot exceed 70 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },
    ogImage: { type: String },

    // Status
    status: {
      type: String,
      enum: ['draft', 'generated', 'edited', 'published'],
      default: 'draft',
      index: true,
    },
    lastGeneratedAt: { type: Date },

    // Version History
    versions: {
      type: [PageVersionSchema],
      default: [],
    },

    // Order
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
BuilderPageSchema.index({ projectId: 1, path: 1 }, { unique: true });
BuilderPageSchema.index({ projectId: 1, order: 1 });
BuilderPageSchema.index({ projectId: 1, status: 1 });

// Virtual for project
BuilderPageSchema.virtual('project', {
  ref: 'BuilderProject',
  localField: 'projectId',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to manage version history
BuilderPageSchema.pre('save', function (next) {
  if (this.isModified('code') && this.code) {
    // Add current code to versions before updating
    const previousCode = this.get('code', null, { getters: false });
    if (previousCode && previousCode !== this.code) {
      this.versions.push({
        code: previousCode,
        createdAt: new Date(),
        prompt: this.aiPrompt,
      });
      // Keep only last 10 versions
      if (this.versions.length > 10) {
        this.versions = this.versions.slice(-10);
      }
    }
  }
  next();
});

BuilderPageSchema.set('toJSON', { virtuals: true });
BuilderPageSchema.set('toObject', { virtuals: true });

export const BuilderPage: Model<IBuilderPage> =
  mongoose.models.BuilderPage || mongoose.model<IBuilderPage>('BuilderPage', BuilderPageSchema);
