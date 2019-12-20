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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchasync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/images/${req.file.filename}`);

  next();
});

// Filter some fields for Update
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

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
    'about'
  );
  if (req.file) filteredBody.photo = req.file.filename;

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

  const userFavourites = await User.findById(userId).select('favorites');

  userFavourites.forEach((el, i) => {
    if (el === favouriteUserId) {
      return next(new AppError('This user is already in your favourites!'));
    }
  });

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
