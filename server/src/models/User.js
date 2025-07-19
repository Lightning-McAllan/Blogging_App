import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please fill a valid email address'
    ]
  },
  password: {
    type: String,
    required: function() {
      return !this.authMethod || this.authMethod !== 'google';
    },
    minlength: 8,
    select: false
  },
  age: {
    type: Number,
    default: 18,
    min: [13, 'You must be at least 13 years old'],
    max: [120, 'Please enter a valid age']
  },
  authMethod: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  about: {
    type: String,
    trim: true,
    default: '',
    maxlength: 500
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isAccountVerified: {
    type: Boolean,
    default: false
  },
  pendingDeletion: {
    type: Boolean,
    default: false
  },
  registrationExpires: {
    type: Date,
    default: function() {
      // Set registration expiry to 5 minutes from now for unverified accounts
      return this.isEmailVerified ? null : new Date(Date.now() + 5 * 60 * 1000);
    }
  },
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  blockExpires: {
    type: Date,
    default: null,
    select: false
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      delete ret.password;
      delete ret.__v;
      delete ret.loginAttempts;
      delete ret.blockExpires;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  }
});

userSchema.virtual('blogs', {
  ref: 'Blog',
  localField: '_id',
  foreignField: 'author',
  justOne: false
});

userSchema.methods = {
  async comparePassword(candidatePassword) {
    // For Google OAuth users, skip password comparison
    if (this.authMethod === 'google') {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  },

  canPostBlog() {
    return this.age >= 13;
  },

  isAccountLocked() {
    return this.blockExpires && this.blockExpires > Date.now();
  }
};

userSchema.statics = {
  async getUsersWithBlogs() {
    return this.find().populate('blogs').exec();
  },

  async getUsersWithoutBlogs() {
    return this.aggregate([
      {
        $lookup: {
          from: 'blogs',
          localField: '_id',
          foreignField: 'author',
          as: 'blogs'
        }
      },
      {
        $match: {
          blogs: { $size: 0 }
        }
      }
    ]);
  }
};

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }

  // Update registration expiry based on email verification status
  if (this.isModified('isEmailVerified')) {
    if (this.isEmailVerified) {
      // Clear registration expiry when email is verified
      this.registrationExpires = null;
    } else if (this.isNew && !this.isEmailVerified) {
      // Set expiry for new unverified accounts
      this.registrationExpires = new Date(Date.now() + 5 * 60 * 1000);
    }
  }

  if (this.isModified('loginAttempts')) {
    this.lastLogin = new Date();
  }

  next();
});

const User = mongoose.model('User', userSchema);
export default User;