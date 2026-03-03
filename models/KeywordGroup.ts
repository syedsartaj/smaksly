import mongoose, { Schema, Document, Model } from 'mongoose';

export type KeywordGroupStatus =
  | 'ungrouped'   // just created, no website assigned
  | 'assigned'    // assigned to a website, waiting for blog
  | 'in_progress' // blog being written
  | 'published'   // blog published, keywords marked used
  | 'paused';     // manually paused

export interface IKeywordGroupAISuggestion {
  blogTitle: string;
  outline: string[];
  targetAudience: string;
  contentType: 'listicle' | 'how-to' | 'comparison' | 'guide' | 'review' | 'news';
  generatedAt: Date;
}

export interface IKeywordGroup extends Document {
  _id: mongoose.Types.ObjectId;

  // Identity
  name: string;           // AI-generated or user-edited group name
  description?: string;
  niche?: string;

  // Keywords (refs to KeywordMaster — no embedded data)
  keywordMasterIds: mongoose.Types.ObjectId[];
  primaryKeywordId?: mongoose.Types.ObjectId; // the main/parent keyword

  // Metrics snapshot (aggregated from member keywords, refreshed periodically)
  totalVolume: number;
  avgKD: number;
  keywordCount: number;

  // Website assignment
  websiteId?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  priorityScore: number; // computed: high volume + low KD + low existing traffic

  // Blog linkage
  blogContentId?: mongoose.Types.ObjectId; // ref → Content, set after blog is created
  blogPublishedAt?: Date;
  blogUrl?: string;

  // Status
  status: KeywordGroupStatus;

  // AI suggestions
  aiSuggestions?: IKeywordGroupAISuggestion;
  lastClusteredAt?: Date;

  // Editable by user
  isUserEdited: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const AIBlogSuggestionSchema = new Schema<IKeywordGroupAISuggestion>(
  {
    blogTitle: { type: String, required: true },
    outline: [{ type: String }],
    targetAudience: { type: String },
    contentType: {
      type: String,
      enum: ['listicle', 'how-to', 'comparison', 'guide', 'review', 'news'],
      default: 'guide',
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const KeywordGroupSchema = new Schema<IKeywordGroup>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      index: true,
    },
    description: { type: String, trim: true },
    niche: { type: String, trim: true, lowercase: true, index: true },

    keywordMasterIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'KeywordMaster',
      },
    ],
    primaryKeywordId: {
      type: Schema.Types.ObjectId,
      ref: 'KeywordMaster',
    },

    // Aggregated metrics (refreshed on save)
    totalVolume: { type: Number, default: 0, min: 0 },
    avgKD: { type: Number, default: 0, min: 0, max: 100 },
    keywordCount: { type: Number, default: 0, min: 0 },

    // Assignment
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      index: true,
    },
    assignedAt: { type: Date },
    priorityScore: { type: Number, default: 0, index: true },

    // Blog
    blogContentId: { type: Schema.Types.ObjectId, ref: 'Content' },
    blogPublishedAt: { type: Date },
    blogUrl: { type: String },

    status: {
      type: String,
      enum: ['ungrouped', 'assigned', 'in_progress', 'published', 'paused'],
      default: 'ungrouped',
      index: true,
    },

    aiSuggestions: { type: AIBlogSuggestionSchema },
    lastClusteredAt: { type: Date },
    isUserEdited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Query indexes
KeywordGroupSchema.index({ websiteId: 1, status: 1 });
KeywordGroupSchema.index({ status: 1, priorityScore: -1 });
KeywordGroupSchema.index({ niche: 1, priorityScore: -1 });
KeywordGroupSchema.index({ totalVolume: -1, avgKD: 1 });
KeywordGroupSchema.index({ status: 1, blogContentId: 1 });

// Virtuals
KeywordGroupSchema.virtual('website', {
  ref: 'Website',
  localField: 'websiteId',
  foreignField: '_id',
  justOne: true,
});

KeywordGroupSchema.virtual('blogContent', {
  ref: 'Content',
  localField: 'blogContentId',
  foreignField: '_id',
  justOne: true,
});

KeywordGroupSchema.virtual('primaryKeyword', {
  ref: 'KeywordMaster',
  localField: 'primaryKeywordId',
  foreignField: '_id',
  justOne: true,
});

KeywordGroupSchema.set('toJSON', { virtuals: true });
KeywordGroupSchema.set('toObject', { virtuals: true });

export const KeywordGroup: Model<IKeywordGroup> =
  mongoose.models.KeywordGroup ||
  mongoose.model<IKeywordGroup>('KeywordGroup', KeywordGroupSchema);
