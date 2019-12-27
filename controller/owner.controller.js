const chatkit = require('../utils/chatkit');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.isActionedUserAdmin = async (req, res, next) => {
  let admin;

  try {
    admin = await chatkit.getUser({ id: req.params.id });
  } catch (err) {
    return next(new AppError('No Admin found with this ID!', 404));
  }

  if (admin.custom_data.role !== 'admin') {
    return next(new AppError('The user to be actioned is not a Admin!'));
  }

  req.adminUser = admin;

  next();
};

exports.allAdmins = catchAsync(async (req, res, next) => {
  const allUsers = await chatkit.getUsers();

  const filteringAdmins = allUsers.filter(el => {
    if (el.custom_data.role === 'admin') {
      return el;
    }
  });

  res.status(200).json({
    status: 'success',
    results: filteringAdmins.length,
    data: { filteringAdmins }
  });
});

exports.createAdmin = catchAsync(async (req, res, next) => {
  const user = await chatkit.createUser({
    id: req.body.id,
    name: req.body.name,
    customData: {
      email: req.body.email,
      password: req.body.password,
      gender: req.body.gender,
      age: req.body.age,
      role: 'admin'
    }
  });

  // user.password = undefined;

  res.status(201).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.removeAdmin = catchAsync(async (req, res, next) => {
  chatkit.asyncDeleteUser({ id: req.params.id });

  res.status(404).json({
    status: 'success',
    data: null
  });
});

exports.banAdmin = catchAsync(async (req, res, next) => {
  const adminId = req.params.id;

  const isBanned = req.adminUser.custom_data.banned;

  await chatkit.updateUser({
    id: adminId,
    customData: {
      ...req.adminUser.custom_data,
      banned: !isBanned
    }
  });

  const bannedAdmin = await chatkit.getUser({ id: req.params.id });

  res.status(200).json({
    status: 'success',
    data: { bannedAdmin }
  });
});

exports.updateAdmin = catchAsync(async (req, res, next) => {
  console.log(req.adminUser.email || req.body.email);

  await chatkit.updateUser({
    id: req.params.id,
    name: req.body.name,
    customData: {
      email: req.body.email || req.adminUser.custom_data.email,
      password: req.body.password || req.adminUser.custom_data.password,
      gender: req.body.gender || req.adminUser.custom_data.gender,
      age: req.body.age || req.adminUser.custom_data.age,
      role: 'admin'
    }
  });

  const updatedAdmin = await chatkit.getUser({
    id: req.params.id
  });

  res.status(200).json({
    status: 'success',
    data: {
      updatedAdmin
    }
  });
});

exports.banningMessages = catchAsync(async (req, res, next) => {
  const banningMessages = await chatkit.fetchMultipartMessages({
    roomId: '8f2a2cbe-5fec-4e54-b7a0-5bda4a78639c',
    limit: 20
  });

  res.status(200).json({
    status: 'success',
    data: {
      banningMessages
    }
  });
});

exports.banUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const user = await chatkit.getUser({ id: userId });

  await chatkit.updateUser({
    id: user.id,
    name: user.name,
    avatarURL: user.avatarURL,
    customData: {
      ...user.custom_data,
      banned: !user.custom_data.banned
    }
  });

  const bannedUser = await chatkit.getUser({ id: req.params.id });

  res.status(200).json({
    status: 'success',
    data: { bannedUser }
  });
});

exports.createReferalLink = catchAsync(async (req, res, next) => {
  const { id: adminId } = req.params;

  const url = `${req.protocol}://${req.get(
    'host'
  )}/v1/api/referal/link/${adminId}`;

  await chatkit.updateUser({
    id: req.adminUser.id,
    name: req.adminUser.name,
    avatarURL: req.adminUser.avatarURL,
    customData: {
      ...req.adminUser.custom_data,
      myReferalLink: url
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      url
    }
  });
});

/*
exports.passwordToHash = async (req, res, next) => {
  req.body.password = await bcrypt.hash(req.body.password, 12);
  next();
};
*/
