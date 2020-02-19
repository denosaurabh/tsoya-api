const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/user.model');
const factoryHandlers = require('./factoryController');
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
  if (
    !req.files.imageCover ||
    !req.files.publicImages ||
    !req.files.privateImages
  )
    return next();

  // 1) Cover image
  req.body.imageCover = `user-${req.user._id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/images/users/${req.body.imageCover}`);

  // 2) Public and Private Images
  req.body.publicImages = [];
  req.body.privateImages = [];

  // Public Images
  await Promise.all(
    req.files.publicImages.map(async (file, i) => {
      const filename = `user-${req.user._id}-${Date.now()}-${i +
        1}-public.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/images/users/${filename}`);

      req.body.publicImages.push(filename);
    })
  );

  // Private Images
  await Promise.all(
    req.files.privateImages.map(async (file, i) => {
      const filename = `user-${req.user._id}-${Date.now()}-${i +
        1}-private.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/images/users/${filename}`);

      req.body.privateImages.push(filename);
    })
  );

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
    'name',
    'email',
    'male',
    'age',
    'sexOrientation',
    'about',
    'imageCover',
    'publicImages',
    'privateImages'
  );

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

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
  console.log(userId, favouriteUserId);

  const userFavourites = await User.findById(userId).select('favorites');

  // if (userFavourites === favouriteUserId) {
  //   return next(new AppError('This user is already in your favourites!'));
  // } else {
  //   userFavourites.forEach((el, i) => {
  //     if (el === favouriteUserId) {
  //       return next(new AppError('This user is already in your favourites!'));
  //     }
  //   });
  // }

  const user = await User.findByIdAndUpdate(userId, {
    $push: { favourites: favouriteUserId }
  }).select('-password -passwordChangedAt');

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.myFavourites = catchasync(async (req, res) => {
  const { favourites } = await User.findById(req.params.id).populate(
    'favourites'
  );

  res.status(200).json({
    status: 'success',
    data: {
      favourites
    }
  });
});

exports.getAllUsers = factoryHandlers.getAll(User);
exports.getUser = factoryHandlers.getOne(User);
