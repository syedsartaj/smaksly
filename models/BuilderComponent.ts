import mongoose, { Schema, Document, Model } from 'mongoose';

export type BuilderComponentType = 'layout' | 'section' | 'element' | 'widget';
export type BuilderComponentScope = 'global' | 'page-specific';

export interface IBuilderComponent extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;

  // Component Info
  name: string;
  displayName: string;
  description?: string;
  type: BuilderComponentType;
  scope: BuilderComponentScope;

  // Generated Code
  code: string;
  propsInterface?: string;

  // AI Context
  aiPrompt?: string;

  // Export Info
  exportPath: string;

  // Usage Tracking
  usedInPages: mongoose.Types.ObjectId[];

  // Props Configuration (for dynamic components)
  defaultProps?: Record<string, unknown>;

  // Preview
  previewImage?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BuilderComponentSchema = new Schema<IBuilderComponent>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'BuilderProject',
      required: [true, 'Project ID is required'],
      index: true,
    },

    // Component Info
    name: {
      type: String,
      required: [true, 'Component name is required'],
      trim: true,
      validate: {
        validator: function (v: string) {
          // PascalCase validation for React components
          return /^[A-Z][a-zA-Z0-9]*$/.test(v);
        },
        message: 'Component name must be PascalCase (e.g., Header, BlogCard)',
      },
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: ['layout', 'section', 'element', 'widget'],
      default: 'section',
      index: true,
    },
    scope: {
      type: String,
      enum: ['global', 'page-specific'],
      default: 'global',
    },

    // Generated Code
    code: {
      type: String,
      required: [true, 'Component code is required'],
    },
    propsInterface: {
      type: String,
    },

    // AI Context
    aiPrompt: {
      type: String,
    },

    // Export Info
    exportPath: {
      type: String,
      required: [true, 'Export path is required'],
      validate: {
        validator: function (v: string) {
          return /^components\/[A-Za-z0-9\/]+\.tsx$/.test(v);
        },
        message: 'Export path must be in format components/Name.tsx',
      },
    },

    // Usage Tracking
    usedInPages: [{
      type: Schema.Types.ObjectId,
      ref: 'BuilderPage',
    }],

    // Props Configuration
    defaultProps: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Preview
    previewImage: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
BuilderComponentSchema.index({ projectId: 1, name: 1 }, { unique: true });
BuilderComponentSchema.index({ projectId: 1, type: 1 });
BuilderComponentSchema.index({ projectId: 1, scope: 1 });

// Virtual for project
BuilderComponentSchema.virtual('project', {
  ref: 'BuilderProject',
  localField: 'projectId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for pages using this component
BuilderComponentSchema.virtual('pages', {
  ref: 'BuilderPage',
  localField: 'usedInPages',
  foreignField: '_id',
});

BuilderComponentSchema.set('toJSON', { virtuals: true });
BuilderComponentSchema.set('toObject', { virtuals: true });

export const BuilderComponent: Model<IBuilderComponent> =
  mongoose.models.BuilderComponent || mongoose.model<IBuilderComponent>('BuilderComponent', BuilderComponentSchema);
