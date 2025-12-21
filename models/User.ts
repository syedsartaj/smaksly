import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'admin' | 'editor' | 'partner';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;

  // Partner specific fields (populated if role is 'partner')
  partnerId?: mongoose.Types.ObjectId;

  // Stripe Connect (for partners)
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'restricted';

  // Auth
  lastLoginAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'partner'],
      default: 'partner',
      index: true,
    },
    avatar: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
    },
    stripeAccountId: {
      type: String,
    },
    stripeAccountStatus: {
      type: String,
      enum: ['pending', 'active', 'restricted'],
    },
    lastLoginAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for full user info
UserSchema.virtual('partner', {
  ref: 'Partner',
  localField: 'partnerId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
