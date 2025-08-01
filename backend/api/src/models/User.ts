import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'researcher';
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      collaboration: boolean;
    };
    privacy: {
      profileVisible: boolean;
      showActivity: boolean;
    };
  };
  profile: {
    bio?: string;
    organization?: string;
    department?: string;
    researchInterests: string[];
    socialLinks: {
      website?: string;
      twitter?: string;
      linkedin?: string;
      orcid?: string;
    };
  };
  stats: {
    claimsCreated: number;
    projectsCreated: number;
    collaborations: number;
    totalReasoningChains: number;
  };
  lastLogin?: Date;
  loginHistory: Array<{
    timestamp: Date;
    ip: string;
    userAgent: string;
  }>;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordHash(password: string): Promise<string>;
  toJSON(): any;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'researcher'],
    default: 'user',
  },
  avatar: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Avatar must be a valid URL',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      collaboration: { type: Boolean, default: true },
    },
    privacy: {
      profileVisible: { type: Boolean, default: true },
      showActivity: { type: Boolean, default: true },
    },
  },
  profile: {
    bio: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    organization: {
      type: String,
      maxlength: 100,
      trim: true,
    },
    department: {
      type: String,
      maxlength: 100,
      trim: true,
    },
    researchInterests: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    socialLinks: {
      website: {
        type: String,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'Website must be a valid URL',
        },
      },
      twitter: String,
      linkedin: String,
      orcid: String,
    },
  },
  stats: {
    claimsCreated: { type: Number, default: 0 },
    projectsCreated: { type: Number, default: 0 },
    collaborations: { type: Number, default: 0 },
    totalReasoningChains: { type: Number, default: 0 },
  },
  lastLogin: Date,
  loginHistory: [{
    timestamp: { type: Date, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
  }],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verificationToken: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, isVerified: 1 });
userSchema.index({ 'profile.organization': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generatePasswordHash = async function(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  delete userObject.verificationToken;
  return userObject;
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

export default mongoose.model<IUser>('User', userSchema);