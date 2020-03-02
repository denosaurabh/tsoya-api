const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const chatkit = require('../utils/chatkit');
const catchAsync = require('../utils/catchAsync');
const factoryHandler = require('../controller/factoryController');
const AppError = require('../utils/appError');

exports.isActionedUserAdmin = async (req, res, next) => {
  const actionUser = await User.findById(req.params.id);

  if (actionUser.role !== 'admin') {
    return next(
      new AppError(
        'The user that is going for action is not a admin! A Owner can only take actions on admins!',
        403
      )
    );
  }

  next();
};

exports.allAdmins = catchAsync(async (req, res, next) => {
  const admins = await User.find({
    role: 'admin',
    userAdmin: { $eq: undefined }
  }).select('-password -passwordChangedAt -disableMiddlewareHooks -userAdmin');

  res.status(200).json({
    status: 'success',
    results: admins.length,
    data: { admins }
  });
});

exports.getAdmin = catchAsync(async (req, res, next) => {
  const admin = await User.findById(req.params.id).select(
    '-password -passwordChangedAt -disableMiddlewareHooks -userAdmin'
  );

  res.status(200).json({
    status: 'success',
    data: { user: admin }
  });
});

exports.createAdmin = catchAsync(async (req, res, next) => {
  const user = await User.create({
    role: 'admin',
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    gender: req.body.gender,
    age: req.body.age
  });

  await chatkit.createUser({
    id: req.body.name,
    name: req.body.name
  });

  user.password = undefined;
  user.passwordChangedAt = undefined;

  res.status(201).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.createReferalLink = catchAsync(async (req, res, next) => {
  const { adminId } = req.params;

  const url = `${req.protocol}://${req.get(
    'host'
  )}/v1/api/referal/link/${adminId}`;

  await User.findByIdAndUpdate(adminId, {
    referalLinkAdmin: url
  });

  res.status(200).json({
    status: 'success',
    data: {
      url
    }
  });
});

exports.removeAdmin = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);

  res.status(404).json({
    status: 'success',
    data: null
  });
});

exports.passwordToHash = async (req, res, next) => {
  req.body.password = await bcrypt.hash(req.body.password, 12);
  next();
};

exports.banAdmin = catchAsync(async (req, res, next) => {
  const { ban, banTime } = req.body;
  const adminId = req.params.id;

  // BanTime Functionalties

  const bannedAdmin = await User.findByIdAndUpdate(adminId, { banned: true });

  res.status(200).json({
    status: 'success',
    data: { bannedAdmin }
  });
});

exports.updateAdmin = factoryHandler.updateOne(User);
