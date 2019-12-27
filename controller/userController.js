const multer = require('multer');
const sharp = require('sharp');
const chatkit = require('../utils/chatkit');
const catchasync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// MIDDLEWARES
exports.uploadUserImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'publicImages', maxCount: 5 },
  { name: 'privateImages', maxCount: 5 }
]);

exports.resizeUserImages = catchasync(async (req, res, next) => {
  // Getting user data
  const user = await chatkit.getUser({ id: req.params.id });

  if (req.files.imageCover) {
    // 1) Cover image
    req.body.imageCover = `user-${req.user.id}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${req.body.imageCover}`);
  }

  // 2) Public and Private Images

  // Public Images
  if (req.files.publicImages) {
    req.body.publicImages = [];

    await Promise.all(
      req.files.publicImages.map(async (file, i) => {
        const filename = `user-${req.user.id}-${Date.now()}-${i +
          1}-public.jpeg`;

        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/users/${filename}`);

        req.body.publicImages.push(filename);
        console.log(user.custom_data.publicImages);

        // req.body.publicImages = user.custom_data.publicImages.push(filename);
      })
    );
  }
  // Private Images
  if (req.files.privateImages) {
    req.body.privateImages = [];

    await Promise.all(
      req.files.privateImages.map(async (file, i) => {
        const filename = `user-${req.user.id}-${Date.now()}-${i +
          1}-private.jpeg`;

        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/users/${filename}`);

        req.body.privateImages.push(filename);
        // req.body.privateImages = user.custom_data.privateImages.push(filename);
      })
    );
  }

  next();
});

// Filter some fields for Update , FUNCTIONS
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// QUERIES
exports.updateMe = catchasync(async (req, res, next) => {
  if (req.body.password) {
    return next(
      new AppError(
        'Password here is not allowed to Update, use /forgotpassword for that',
        400
      )
    );
  }

  const filteredBody = filterObj(
    req.body,
    'email',
    'male',
    'age',
    'sexOrientation',
    'imageCover',
    'publicImages',
    'privateImages',
    'about'
  );

  await chatkit.updateUser({
    id: req.user.id,
    name: req.body.name || req.user.name,
    customData: {
      ...req.user.custom_data,
      ...filteredBody
    }
  });

  const updatedUser = await chatkit.getUser({ id: req.params.id });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.favouriteUser = catchasync(async (req, res, next) => {
  const userId = req.user.id;
  const favouriteUserId = req.params.id;

  const user = await chatkit.getUser({ id: userId });

  let gotErr = false;
  if (user.custom_data.favourites) {
    user.custom_data.favourites.forEach(el => {
      if (el === favouriteUserId) {
        gotErr = true;
      }
    });

    if (gotErr) {
      return next(
        new AppError('This user is already in your favourites!', 400)
      );
    }

    await chatkit.updateUser({
      id: userId,
      name: user.name,
      customData: {
        ...user.custom_data,
        favourites: [...user.custom_data.favourites, favouriteUserId]
      }
    });
  } else {
    await chatkit.updateUser({
      id: userId,
      name: user.name,
      customData: {
        favourites: [favouriteUserId],
        ...user.custom_data
      }
    });
  }

  const updatedUser = await chatkit.getUser({ id: req.user.id });

  res.status(200).json({
    status: 'success',
    data: {
      updatedUser
    }
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.myFavourites = catchasync(async (req, res) => {
  const {
    custom_data: { favourites }
  } = await chatkit.getUser({ id: req.user.id });

  const favouritesUsers = await chatkit.getUsersById({ userIds: favourites });

  res.status(200).json({
    status: 'success',
    data: {
      favouritesUsers
    }
  });
});

exports.getAllUsers = catchasync(async (req, res) => {
  const allUsers = await chatkit.getUsers();

  // Filtering own user OR Amins Own Fake Users
  const filteredUsers = allUsers.filter(el => {
    if (
      el.id !== req.user.id &&
      el.custom_data.userAdmin !== req.user.id &&
      el.custom_data.banned !== true
    ) {
      return el;
    }
  });

  // Filtering Users Data
  const filteringUserData = filteredUsers.map(el => {
    el.id = undefined;
    el.custom_data.password = undefined;
    el.custom_data.favourites = undefined;
    el.custom_data.credits = undefined;
    el.custom_data.userAdmin = undefined;
    el.custom_data.privateImages = undefined;

    return el;
  });

  res.status(200).json({
    status: 'success',
    results: filteredUsers.length,
    data: {
      filteringUserData
    }
  });
});

exports.getUser = catchasync(async (req, res) => {
  const user = await chatkit.getUser({ id: req.params.id });

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// Get more credits after Email
exports.verifyUser = catchasync(async (req, res, next) => {
  const user = await chatkit.getUser({ id: req.params.id });

  if (user.custom_data.emailVerified) {
    return next(new AppError('Your email is already verified!'));
  }

  await chatkit.updateUser({
    id: req.params.id,
    name: user.name,
    avatarURL: req.user.avatarURL,
    customData: {
      ...user.custom_data,
      emailVerified: true,
      credits: user.credits + 130
    }
  });

  const verifiedUser = await chatkit.getUser({ id: req.params.id });

  res.status(200).json({
    status: 'success',
    data: {
      verifiedUser
    }
  });
});

exports.referalLinkAttach = catchasync(async (req, res, next) => {
  const adminId = req.params.adminId;

  await chatkit.updateUser({
    id: req.user.id,
    name: req.user.name,
    avatarURL: req.user.avatarURL,
    customData: {
      ...req.user.custom_data,
      attachedAdmin: adminId
    }
  });

  const updatedUser = await chatkit.getUser({ id: req.user.id });

  res.status(200).json({
    status: 'success',
    data: { updatedUser }
  });
});
