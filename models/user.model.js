const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    minlength: [3, 'Your name is too short!, keep it minimum 3 characters'],
    maxlength: [50, 'Your name is too Big!, keep it with in 50 characters'],
    unique: true,
    required: [true, 'User name is required']
  },
  email: {
    type: String,
    required: [true, 'User email is required'],
    unique: true,
    validate: [validator.isEmail, 'Please provide a valid Email!']
  },
  password: {
    type: String,
    required: [true, 'User password is required!']
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    default: 'male'
  },
  age: {
    type: Number,
    required: [true, 'User age is required!'],
    validate: {
      validator: function(val) {
        return val > 18;
      },
      message: 'Your age is not eligible for this website'
    }
  },
  about: {
    type: String,
    minlength: [
      50,
      'Your Description is too short! Kepp it more than 50 characters'
    ],
    maxlength: [
      1200,
      'Your Description is too long! Keep it within 1200 characters'
    ],
    trim: true
  },
  sexOrientation: {
    type: String,
    enum: ['Homosexual', 'Hetrosexual', 'Bisexual']
  },
  imageCover: {
    type: String
  },
  publicImages: [String],
  privateImages: [String],
  favourites: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  ],
  role: {
    type: String,
    enum: ['user', 'admin', 'owner'],
    default: 'user'
  },
  userAdmin: {
    type: String,
    default: null
  },
  referalLinkAdmin: {
    type: String,
    default: null
  },
  disableMiddlewareHooks: {
    type: Boolean,
    default: false
  },
  online: { type: Boolean, default: false },
  banned: { type: Boolean, default: false },
  banTime: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerified: Boolean,
  credits: Number
});

// Middlewares and Functions before Saving and after Saving
userSchema.pre('save', async function(next) {
  /*
   These are because the Users made by Admins have not passwords and other things. So, disabling all the Middlewares to execute if the User is made by admin 
  */

  if (this.userAdmin) {
    this.password = undefined;
    console.log('PRE SAVE Hooks executes');
    return next();
  }
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// userSchema.pre('save', function(next) {
//   if (this.disableMiddlewareHooks) return next();

//   if (!this.isModified('password') || this.isNew) return next();

//   this.passwordChangedAt = Date.now() - 1000;
//   next();
// });

userSchema.pre('save', function(next) {
  if (this.disableMiddlewareHooks) return next();

  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Schema Methods
userSchema.methods.saveWithoutValidation = function(next) {
  const defaultValidate = this.validate;
  this.validate = function(next) {
    next();
  };

  const self = this;
  this.save(function(err, doc, numberAffected) {
    self.validate = defaultValidate;
    next(err, doc, numberAffected);
  });
};

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
