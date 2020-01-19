const rateLimit = require('express-rate-limit');
const Validator = require('validatorjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');

const chatkit = require('../utils/chatkit');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

exports.signUplimiter = rateLimit({
  max: 4,
  windowMs: 31536000 * 1000,
  message: 'A user can only sign up once!'
});

const signToken = id => {
  const jsonPayload = {
    instance: process.env.PUSHER_INSTANCE_ID,
    iss: process.env.PUSHER_KEY_ID,
    iat: Date.now(),
    exp: Date.now() + 3600,
    sub: id
  };

  return jwt.sign(jsonPayload, process.env.JWT_SECRET);
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Pusher SignUp
exports.signUp = catchAsync(async (req, res, next) => {
  const data = {
    id: req.body.id,
    name: req.body.name,
    customData: {
      email: req.body.email,
      password: req.body.password,
      gender: req.body.gender,
      age: req.body.age,
      credits: 120,
      role: 'user'
    }
  };

  /*
  const rules = {
    id: 'required|size:7',
    name: 'required|size:3',
    customData: {
      email: 'required|email',
      age: 'min:18'
    }
  };

  const validation = new Validator(data, rules);

  validation.errors.get();

  if (validation.passes()) { 
    */
  const newUser = await chatkit.createUser(data);

  const url = `${req.protocol}://${req.get('host')}/verify/${req.body.id}`;

  // Sending Mail
  if (process.env.NODE_ENV === 'production') {
    //await new Email(newUser, url).sendWelcome(url);
  }

  createSendToken(newUser, 201, req, res);
  /*} else {
    return next(new AppError('Please provide appropriate data', 400));
  }*/
});

exports.login = catchAsync(async (req, res, next) => {
  const { user_id: id, password } = req.query;

  const authData = chatkit.authenticate({
    userId: id
  });

  console.log(authData.body);

  const decoded = await promisify(jwt.verify)(
    authData.body.access_token,
    process.env.JWT_PUSHER_SECRET
  );
  console.log(decoded);

  const user = await chatkit.getUser({
    id
  });

  if (user.custom_data.password !== password) {
    return next(new AppError('Email or Password is incorrect!', 404));
  }

  // For Banned Users
  if (user.custom_data.banned) {
    return next(
      new AppError('You are currently from this server banned!', 403)
    );
  }

  // For Admins Fake Profiles
  if (user.custom_data.userAdmin) {
    return next(new AppError('This user cannot login into the Server!', 403));
  }

  // Sending token
  user.token = authData.body.access_token;

  // createSendToken(user, 200, req, res);
  res.status(200).json(authData.body);
});

// Restricted Routes for some users
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (req.originalUrl === '/v1/api/admin/logback') {
      if (req.user.custom_data.userAdmin) {
        return next();
      }
    }

    // roles ['owner', 'admin']. role='user'
    if (!roles.includes(req.user.custom_data.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

// Forgot Password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await chatkit.getUser({ id: req.body.name });

  if (!user) {
    return next(new AppError('There is no user with name.', 404));
  }

  // 2) Generate the random reset token
  const resetTokenByte = crypto.randomBytes(32).toString('hex');
  const resetToken = `${resetTokenByte}$_$${user.id}`;

  const passwordResetToken = crypto
    .createHash('sha256')
    .update(resetTokenByte)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  const passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // 3) Saving to User data
  await chatkit.updateUser({
    id: req.body.name,
    name: user.name,
    avatarURL: user.avatarURL,
    customData: {
      ...user.custom_data,
      passwordResetToken,
      passwordResetExpires
    }
  });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    // Sending Email
    console.log(resetURL);

    if (process.env.NODE_ENV === 'production') {
      await new Email(user, resetURL).sendPasswordReset(resetURL);
    }

    res.status(200).json({
      status: 'success',
      message: `Token sent to email! ${resetURL}`
    });
  } catch (err) {
    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

// Reset Password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token.split('$_$')[0])
    .digest('hex');

  const userId = req.params.token.split('$_$')[1];

  const user = await chatkit.getUser({ id: userId });

  // await chatkit.updateUser({
  //   id: userId,
  //   name: user.name,
  //   avatarURL: user.avatarURL,
  //   customData: {
  //     passwordResetToken: hashedToken,
  //     passwordResetExpires: { $gt: Date.now() }
  //   }
  // });

  console.log(user.custom_data.passwordResetToken, hashedToken);
  if (
    user.custom_data.passwordResetToken != hashedToken ||
    user.custom_data.passwordResetExpires < Date.now()
  ) {
    return next(new AppError('Expired or Wrong Token! Please try again', 400));
  }

  // Updating User
  await chatkit.updateUser({
    id: userId,
    name: user.name,
    avatarURL: user.avatarURL,
    customData: {
      ...user.custom_data,
      password: req.body.password,
      passwordResetExpires: undefined,
      passwordResetToken: undefined
    }
  });

  const updatedPasswordUser = await chatkit.getUser({ id: userId });

  // 4) Log the user in
  createSendToken(updatedPasswordUser, 200, req, res);
});

// Protecting Endpoints for some users
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_PUSHER_SECRET
  );

  const user = await chatkit.getUser({
    id: decoded.sub
  });

  req.user = user;
  // req.locals.user = user;

  next();
});

// SAMLL MIDDLEWARE FOR REFERAL LINK USERS
exports.referalLink = (req, res, next) => {
  if (!req.params.link) next();

  req.body.referalLinkAdmin = req.params.link;
};
