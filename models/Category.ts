import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;

  // Hierarchy
  parentId?: mongoose.Types.ObjectId;
  level: number; // 0 = root, 1 = child, 2 = grandchild
  path: string; // e.g., "technology/software/saas"

  // SEO
  metaTitle?: string;
  metaDescription?: string;

  // Website Assignment (empty = available to all websites)
  websiteIds: mongoose.Types.ObjectId[];

  // Stats
  websiteCount: number;
  keywordCount: number;
  contentCount: number;

  // Settings
  isActive: boolean;
  displayOrder: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    icon: { type: String },
    color: { type: String },

    // Hierarchy
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    path: {
      type: String,
      default: '',
      index: true,
    },

    // SEO
    metaTitle: {
      type: String,
      maxlength: [70, 'Meta title cannot exceed 70 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },

    // Website Assignment
    websiteIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Website',
    }],

    // Stats
    websiteCount: { type: Number, default: 0 },
    keywordCount: { type: Number, default: 0 },
    contentCount: { type: Number, default: 0 },

    // Settings
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
CategorySchema.index({ parentId: 1, displayOrder: 1 });
CategorySchema.index({ isActive: 1, level: 1 });
CategorySchema.index({ websiteIds: 1 });

// Pre-save hook to update path
CategorySchema.pre('save', async function (next) {
  if (this.isModified('parentId') || this.isNew) {
    if (this.parentId) {
      const parent = await mongoose.model('Category').findById(this.parentId);
      if (parent) {
        this.level = parent.level + 1;
        this.path = parent.path ? `${parent.path}/${this.slug}` : this.slug;
      }
    } else {
      this.level = 0;
      this.path = this.slug;
    }
  }
  next();
});

// Virtual for parent category
CategorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for child categories
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
});

// Virtual for websites
CategorySchema.virtual('websites', {
  ref: 'Website',
  localField: '_id',
  foreignField: 'categoryId',
});

// Category tree item type for static method
interface CategoryTreeItem {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: mongoose.Types.ObjectId;
  level: number;
  path: string;
  isActive: boolean;
  displayOrder: number;
  children: CategoryTreeItem[];
}

// Static method to get category tree
CategorySchema.statics.getTree = async function (): Promise<CategoryTreeItem[]> {
  const categories = await this.find({ isActive: true })
    .sort({ level: 1, displayOrder: 1 })
    .lean();

  type LeanCategory = {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    parentId?: mongoose.Types.ObjectId;
    level: number;
    path: string;
    isActive: boolean;
    displayOrder: number;
  };

  const buildTree = (items: LeanCategory[], parentId: mongoose.Types.ObjectId | null = null): CategoryTreeItem[] => {
    return items
      .filter((item) => {
        if (parentId === null) {
          return !item.parentId;
        }
        return item.parentId?.toString() === parentId.toString();
      })
      .map((item) => ({
        ...item,
        children: buildTree(items, item._id),
      }));
  };

  return buildTree(categories as LeanCategory[]);
};

// Static method to update counts
CategorySchema.statics.updateCounts = async function (categoryId: mongoose.Types.ObjectId) {
  const Website = mongoose.model('Website');
  const Keyword = mongoose.model('Keyword');
  const Content = mongoose.model('Content');

  const [websiteCount, keywordCount, contentCount] = await Promise.all([
    Website.countDocuments({ categoryId }),
    Keyword.countDocuments({ categoryId }),
    Content.countDocuments({ categoryId }),
  ]);

  await this.findByIdAndUpdate(categoryId, {
    websiteCount,
    keywordCount,
    contentCount,
  });
};

CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
