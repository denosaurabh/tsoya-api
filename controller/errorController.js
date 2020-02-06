const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleConnectReset = err => {
  const message =
    'Seems like Something went srong with the Internet Connection! PLease try again later';
  return new AppError(message, 500);
};

const handleUserNotFound = err => {
  const message = `User not found! Please check again`;
  return new AppError(message, 404);
};

const handleValidationerrPusher = err => {
  const message = `Invalid data send!`;
  return new AppError(message, 400);
};

const handleNoRoom = () => {
  const message = `No room found with this ID!`;
  return new AppError(message, 404);
};

const sendErrorDev = (err, req, res) => {
  // A) API
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/v1/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: err.error_description
    });
  }

  // B) RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    return new AppError('Something went wrong!', 500);
  }
  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error('ERROR 💥', err);
  // 2) Send generic message
  return new AppError(
    'Error, Something went wrong! Please try again later.',
    err.statusCode
  );
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.log(err);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND')
      handleConnectReset(error);
    //if (error.error === 'services/chatkit/not_found/user_not_found') handleUserNotFound(error);
    if (
      error.error_uri ===
      'https://docs.pusher.com/errors/services/chatkit/bad_request/validation_failed'
    ) {
      handleValidationerrPusher(error);
    }
    if (
      error.error_uri ===
      'https://docs.pusher.com/errors/services/chatkit/not_found/room_not_found'
    )
      if (error.name === 'ValidationError')
        error = handleValidationErrorDB(error);

    sendErrorProd(error, req, res);
  }
};
