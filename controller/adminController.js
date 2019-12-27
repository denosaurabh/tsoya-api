const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const crypto = require('crypto');
const { promisify } = require('util');

const chatkit = require('../utils/chatkit');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const createSendToken = (user, statusCode, req, res, token) => {
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  res.status(statusCode).json({
    status: 'success',
    data: {
      user
    }
  });
};

// MIDDLEWARES
exports.isActionFakeUserAdmin = catchAsync(async (req, res, next) => {
  const user = await chatkit.getUser({ id: req.params.id });

  if (user.custom_data.userAdmin === req.user.id) {
    req.adminFakeUser = user;
    next();
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
  const users = await chatkit.getUsers();

  const myFakeProfiles = users.filter(el => {
    if (el.custom_data && el.custom_data.userAdmin === req.user.id) {
      return el;
    }
  });

  res.status(200).json({
    status: 'success',
    results: myFakeProfiles.length,
    data: { myFakeProfiles }
  });
});

exports.makeUsers = catchAsync(async (req, res, next) => {
  const { id, name, age, gender, about, sexDetermination } = req.body;

  const user = await chatkit.createUser({
    id,
    name,
    customData: {
      age,
      gender,
      about,
      sexDetermination,
      userAdmin: req.user.id,
      role: 'user',
      credits: 'unlimited'
    }
  });

  // Secreting Some Things

  res.status(201).json({
    status: 'success',
    data: { user }
  });
});

// Login with Fake Profiles
exports.loginwithFakeProfile = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const fakeUser = await chatkit.getUser({ id });

  if (fakeUser.custom_data.userAdmin !== req.user.id) {
    return next(new AppError('This user is not your Fake Profiles'));
  }

  const authData = chatkit.authenticate({
    userId: id
  });

  const decoded = await promisify(jwt.verify)(
    authData.body.access_token,
    process.env.JWT_PUSHER_SECRET
  );

  const user = await chatkit.getUser({
    id: decoded.sub
  });

  // Sending token
  // req.fakeUser = user;
  // req.fakeUser.admin = req.user.id;
  user.token = authData.body.access_token;

  createSendToken(user, 200, req, res, authData.body.access_token);
});

// Log back to Admin if the Admin Fake User is loged In
exports.loginInBackToAdmin = catchAsync(async (req, res, next) => {
  if (!req.fakeUser) {
    return next(new AppError('There is no admin fake user logged in!', 404));
  }

  const { userAdmin } = req.fakeUser.custom_data;

  if (!userAdmin) {
    return next(new AppError('This user is not one of your Fake users!', 403));
  }

  const authData = chatkit.authenticate({
    userId: userAdmin
  });

  const decoded = await promisify(jwt.verify)(
    authData.body.access_token,
    process.env.JWT_PUSHER_SECRET
  );

  const user = await chatkit.getUser({
    id: decoded.sub
  });

  // Sending token
  req.user = user;
  user.token = authData.body.access_token;

  createSendToken(user, 200, req, res, authData.body.access_token);
});

// Protecting
exports.protectFakeProfile = catchAsync(async (req, res, next) => {
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

  console.log(user.custom_data.userAdmin, req.user.id);
  /*
  if (user.custom_data.userAdmin !== req.user.id) {
    return next(
      new AppError(
        'This user is not one of your Fake Profiles! Permission Discarded',
        403
      )
    );
  }*/

  req.fakeUser = user;
  // req.locals.user = user;

  next();
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
    'male',
    'age',
    'sexOrientation',
    'about'
  );

  await chatkit.updateUser({
    id: req.params.id,
    name: req.body.name || req.adminFakeUser.name,
    avatarURL: req.body.imageCover || req.adminFakeUser.avatarURL,
    customData: { ...req.adminFakeUser.custom_data, filteredBody }
  });

  const updatedAdminUser = await chatkit.getUser({ id: req.params.id });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedAdminUser
    }
  });
});

exports.transferFakeUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const user = await chatkit.getUser({ id: userId });

  if (user.custom_data.userAdmin !== req.user.id) {
    return next(
      new AppError('This user is not one of your Fake Profiles', 403)
    );
  }

  const message = await chatkit.sendSimpleMessage({
    userId: req.user.id,
    roomId: '66520afe-e8a5-4058-b649-c71287be717d',
    text: `${JSON.stringify(user)}`
  });

  res.status(200).json({
    status: 'success',
    data: message
  });
});

exports.getProfilesOwnerShipsMessages = catchAsync(async (req, res, next) => {
  const messages = await chatkit.fetchMultipartMessages({
    roomId: '66520afe-e8a5-4058-b649-c71287be717d',
    limit: 20
  });

  res.status(200).json({
    status: 'success',
    data: messages
  });
});

exports.getOwnerShipUser = catchAsync(async (req, res, next) => {
  const { parts } = await chatkit.fetchMultipartMessage({
    roomId: '66520afe-e8a5-4058-b649-c71287be717d',
    messageId: req.params.id
  });

  const fakeUserStr = parts[0].content;

  const fakeUserObj = JSON.parse(fakeUserStr);
  console.log(fakeUserObj);

  await chatkit.updateUser({
    id: fakeUserObj.id,
    name: fakeUserObj.name,
    avatarURL: fakeUserObj.avatarURL,
    customData: {
      ...fakeUserObj.custom_data,
      userAdmin: req.user.id
    }
  });

  const fakeUser = await chatkit.getUser({ id: fakeUserObj.id });

  // Deleing Message
  await chatkit.deleteMessage({
    roomId: '66520afe-e8a5-4058-b649-c71287be717d',
    messageId: req.params.id
  });

  res.status(200).json({
    status: 'success',
    data: { fakeUser }
  });
});

/*
exports.toggleOnline = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const { online } = await chatkit.getUser({id});

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
  const { myReferalLink } = req.user.custom_data;

  res.status(200).json({
    status: 'success',
    data: { myReferalLink }
  });
});
