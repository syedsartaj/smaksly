import mongoose, { Schema, Document, Model } from 'mongoose';

export type BuilderAssetType = 'image' | 'font' | 'icon' | 'document' | 'video';

export interface IBuilderAsset extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;

  // Asset Info
  name: string;
  originalName: string;
  type: BuilderAssetType;

  // Storage
  url: string;
  publicId?: string; // Cloudinary public ID
  thumbnailUrl?: string;

  // Metadata
  size: number; // bytes
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };

  // Accessibility
  alt?: string;
  caption?: string;

  // Organization
  folder?: string;
  tags?: string[];

  // Usage Tracking
  usedInPages?: mongoose.Types.ObjectId[];
  usedInComponents?: mongoose.Types.ObjectId[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BuilderAssetSchema = new Schema<IBuilderAsset>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'BuilderProject',
      required: [true, 'Project ID is required'],
      index: true,
    },

    // Asset Info
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['image', 'font', 'icon', 'document', 'video'],
      required: [true, 'Asset type is required'],
      index: true,
    },

    // Storage
    url: {
      type: String,
      required: [true, 'URL is required'],
    },
    publicId: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },

    // Metadata
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: 0,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    dimensions: {
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },

    // Accessibility
    alt: {
      type: String,
      maxlength: [200, 'Alt text cannot exceed 200 characters'],
    },
    caption: {
      type: String,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
    },

    // Organization
    folder: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],

    // Usage Tracking
    usedInPages: [{
      type: Schema.Types.ObjectId,
      ref: 'BuilderPage',
    }],
    usedInComponents: [{
      type: Schema.Types.ObjectId,
      ref: 'BuilderComponent',
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
BuilderAssetSchema.index({ projectId: 1, type: 1 });
BuilderAssetSchema.index({ projectId: 1, folder: 1 });
BuilderAssetSchema.index({ projectId: 1, createdAt: -1 });

// Text index for search
BuilderAssetSchema.index({ name: 'text', alt: 'text', tags: 'text' });

// Virtual for project
BuilderAssetSchema.virtual('project', {
  ref: 'BuilderProject',
  localField: 'projectId',
  foreignField: '_id',
  justOne: true,
});

BuilderAssetSchema.set('toJSON', { virtuals: true });
BuilderAssetSchema.set('toObject', { virtuals: true });

export const BuilderAsset: Model<IBuilderAsset> =
  mongoose.models.BuilderAsset || mongoose.model<IBuilderAsset>('BuilderAsset', BuilderAssetSchema);
