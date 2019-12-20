const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factoryHandler = require('../controller/factoryController');

exports.makeUsers = catchAsync(async (req, res, next) => {
  const { name, age } = req.body;

  const user = await User.create({
    name,
    age,
    disableMiddlewareHooks: false
  });

  res.status(201).json({
    status: 'success',
    data: { user }
  });
});
