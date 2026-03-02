import mongoose, { Schema, Document, Model } from 'mongoose';

export type BuilderProjectStatus = 'draft' | 'building' | 'ready' | 'published' | 'error';
export type BlogLayoutType = 'grid' | 'list' | 'masonry';

export interface IBuilderProjectBranding {
  headerLogo?: string;
  footerLogo?: string;
  websiteIcon?: string;
  indexName?: string;
  logoAltText?: string;
}

export interface ISeoMetadata {
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterHandle?: string;
  themeColor?: string;
}

export interface ILanguageConfig {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
  isDefault: boolean;
}

export interface IBuilderProjectSettings {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  siteName: string;
  siteDescription: string;
  favicon?: string;
  logo?: string;
  branding?: IBuilderProjectBranding;
  seoMetadata?: ISeoMetadata;
  languages?: ILanguageConfig[];
  defaultLanguage?: string;
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
}

export interface IBuilderBlogConfig {
  enabled: boolean;
  postsPerPage: number;
  layout: BlogLayoutType;
  showCategories: boolean;
  showTags: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showReadTime: boolean;
}

export interface IBuilderProject extends Document {
  _id: mongoose.Types.ObjectId;
  websiteId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  status: BuilderProjectStatus;

  // GitHub/Vercel Integration
  gitRepoUrl?: string;
  gitRepoName?: string;
  vercelProjectId?: string;
  deploymentUrl?: string;
  lastDeployedAt?: Date;
  lastCommitHash?: string;
  lastCommitMessage?: string;

  // Project Configuration
  framework: 'nextjs';
  settings: IBuilderProjectSettings;

  // Blog Integration
  blogConfig: IBuilderBlogConfig;

  // Metadata
  createdBy?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BuilderProjectSchema = new Schema<IBuilderProject>(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Website ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'building', 'ready', 'published', 'error'],
      default: 'draft',
      index: true,
    },

    // GitHub/Vercel Integration
    gitRepoUrl: { type: String, trim: true },
    gitRepoName: { type: String, trim: true },
    vercelProjectId: { type: String, trim: true },
    deploymentUrl: { type: String, trim: true },
    lastDeployedAt: { type: Date },
    lastCommitHash: { type: String },
    lastCommitMessage: { type: String },

    // Framework (fixed for now)
    framework: {
      type: String,
      enum: ['nextjs'],
      default: 'nextjs',
    },

    // Project Settings
    settings: {
      primaryColor: { type: String, default: '#10b981' },
      secondaryColor: { type: String, default: '#06b6d4' },
      fontFamily: { type: String, default: 'Inter' },
      siteName: { type: String, default: 'My Website' },
      siteDescription: { type: String, default: '' },
      favicon: { type: String },
      logo: { type: String },
      branding: {
        headerLogo: { type: String },
        footerLogo: { type: String },
        websiteIcon: { type: String },
        indexName: { type: String },
        logoAltText: { type: String },
      },
      seoMetadata: {
        ogImage: { type: String },
        twitterCard: { type: String, enum: ['summary', 'summary_large_image'] },
        twitterHandle: { type: String },
        themeColor: { type: String },
      },
      languages: [{
        code: { type: String, required: true },
        name: { type: String, required: true },
        direction: { type: String, enum: ['ltr', 'rtl'], default: 'ltr' },
        isDefault: { type: Boolean, default: false },
      }],
      defaultLanguage: { type: String, default: 'en' },
      socialLinks: {
        twitter: { type: String },
        facebook: { type: String },
        instagram: { type: String },
        linkedin: { type: String },
        youtube: { type: String },
      },
    },

    // Blog Configuration
    blogConfig: {
      enabled: { type: Boolean, default: true },
      postsPerPage: { type: Number, default: 9, min: 1, max: 50 },
      layout: {
        type: String,
        enum: ['grid', 'list', 'masonry'],
        default: 'grid',
      },
      showCategories: { type: Boolean, default: true },
      showTags: { type: Boolean, default: true },
      showAuthor: { type: Boolean, default: true },
      showDate: { type: Boolean, default: true },
      showReadTime: { type: Boolean, default: true },
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
BuilderProjectSchema.index({ websiteId: 1, status: 1 });
BuilderProjectSchema.index({ createdBy: 1 });
BuilderProjectSchema.index({ updatedAt: -1 });

// Virtual for website
BuilderProjectSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

BuilderProjectSchema.set('toJSON', { virtuals: true });
BuilderProjectSchema.set('toObject', { virtuals: true });

export const BuilderProject: Model<IBuilderProject> =
  mongoose.models.BuilderProject || mongoose.model<IBuilderProject>('BuilderProject', BuilderProjectSchema);
