const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

/// Updaing Single Document
exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found to Update', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

// Get all Objects
exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Model.find(), req.query).filter().sort();

    const data = await features.query;

    res.status(200).json({
      status: 'success',
      message: {
        data
      }
    });
  });

// Get only One
exports.getOne = Model =>
  catchAsync(async (req, res, next) => {
    const query = Model.findById(req.params.id)
      .select('-password')
      .populate('favourites');

    // if (popOptions) query = query.populate(popOptions);
    const data = await query;

    if (!data) {
      return next(new AppError('Nothing found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data
      }
    });
  });

// Delete Document
exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    await Model.deleteOne({ _id: req.params.id });

    res.status(400).json({
      status: 'success',
      data: null
    });
  });
