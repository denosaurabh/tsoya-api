const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factoryHandler = require('../controller/factoryController');

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
exports.myFakeProfiles = catchAsync(async (req, res, next) => {
  const myFakeProfiles = await User.find({ userAdmin: { $eq: req.user._id } });

  res.status(200).json({
    status: 'success',
    results: myFakeProfiles.length,
    data: { myFakeProfiles }
  });
});

exports.makeUsers = catchAsync(async (req, res, next) => {
  const { name, age, gender } = req.body;

  const user = await User.create({
    name,
    age,
    gender,
    userAdmin: req.user._id,
    role: 'admin',
    credits: undefined,
    email: process.env.ADMIN_FAKE_PROFILE_TEMP_DATA_EMAIL,
    password: process.env.ADMIN_FAKE_PROFILE_TEMP_DATA_PASS
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

/*
exports.toggleOnline = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const { online } = await User.findById(id);

  const updatedUser = await User.findByIdAndUpdate(id, {
    $set: { online: !online }
  });

  res.status(200).json({
    status: 'success',
    data: { updatedUser }
  });
});
*/

exports.myreferalLink = catchAsync(async (req, res, next) => {
  const myReferalLink = await User.findById(req.user._id).select(
    'referalLinkAdmin'
  );

  res.status(200).json({
    status: 'success',
    data: { myReferalLink }
  });
});
