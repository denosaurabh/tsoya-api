const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factoryHandler = require('../controller/factoryController');
const chatkit = require('../utils/chatkit');

// MIDDLEWARES
exports.isActionFakeUserAdmin = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (user.userAdmin == req.user._id) {
    return next();
  } else {
    return next(
      new AppError(
        'The User which is in action is not your one of Fake Profiles! A Admin can only update his own Fake Profiles',
        403
      )
    );
  }
});

// QUERIES
exports.users = catchAsync(async (req, res, next) => {
  const users = await User.find({ role: 'user' });

  res.status(200).json({
    status: 'success',
    data: {
      users
    }
  });
});

exports.myFakeProfiles = catchAsync(async (req, res, next) => {
  const myFakeProfiles = await User.find({ userAdmin: { $eq: req.user._id } });

  res.status(200).json({
    status: 'success',
    results: myFakeProfiles.length,
    data: { myFakeProfiles }
  });
});

exports.makeUsers = catchAsync(async (req, res, next) => {
  const { name, age, gender, email, about } = req.body;

  const user = await User.create({
    name,
    age,
    userAdmin: req.user._id,
    role: 'admin',
    credits: undefined,
    email,
    about,
    password: process.env.ADMIN_FAKE_PROFILE_TEMP_DATA_PASS
  });

  await chatkit.createUser({
    id: req.body.name,
    name: req.body.name
  });

  // Secreting Some Things
  user.password = undefined;
  user.credits = undefined;

  res.status(201).json({
    status: 'success',
    data: { user }
  });
});

// exports.updatemyFakeUser = factoryHandler.updateOne(User);

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// QUERIES
exports.updatemyFakeUser = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    'name',
    'male',
    'age',
    'notes',
    'sexOrientation',
    'about',
    'imageCover',
    'publicImages',
    'privateImages'
  );

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    filteredBody,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

const signToken = id => {
  console.log(process.env.JWT_SECRET);

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  // Remove password from output
  user.password = undefined;
  user.referalLinkAdmin = undefined;

  // Including Chatkit Auth
  const authData = chatkit.authenticate({
    userId: user.name
  });

  res.status(statusCode).json({
    status: 'success',
    token,
    chatToken: authData.body,
    data: {
      user
    }
  });
};

exports.adminProfileLogin = catchAsync(async (req, res, next) => {
  const adminProfileId = req.params.id;

  const adminprofile = await User.findById(adminProfileId);

  if (!adminprofile) {
    return next(new AppError('No Admin Profile found !!', 404));
  }

  if (adminprofile.userAdmin !== req.user.id) {
    return next(new AppError('That not your one of profiles!', 401));
  }

  createSendToken(adminprofile, 200, req, res);
});

exports.chatLoginAdminProfile = catchAsync(async (req, res, next) => {
  const adminProfileId = req.query.id;

  const adminProfile = await User.findById(adminProfileId).select('-password');
  console.log(adminProfile.userAdmin, req.user.name, adminProfile);

  if (!adminProfile.userAdmin) {
    return next(new AppError('This is not a Admin Profile', 400));
  }

  const admin = await User.findById(adminProfile.userAdmin);

  if (admin.name !== req.user.name) {
    return next(
      new AppError(
        'Seems like the profile you are getting access is not yours !!',
        400
      )
    );
  }

  const authData = chatkit.authenticate({
    userId: adminProfile.name
  });

  res.status(200).json(authData.body);
});

exports.myreferalLink = catchAsync(async (req, res, next) => {
  const myReferalLink = await User.findById(req.user._id).select(
    'referalLinkAdmin'
  );

  res.status(200).json({
    status: 'success',
    data: { myReferalLink }
  });
});
