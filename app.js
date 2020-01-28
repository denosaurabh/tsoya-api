const express = require('express');

const morgan = require('morgan');

const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const globalErorHandler = require('./controller/errorController');
const AppError = require('./utils/appError');

const userRoute = require('./routes/user.routes');
const ownerRoute = require('./routes/owner.routes');
const adminRoute = require('./routes/admin.routes');
const chatRoute = require('./routes/chat.routes');
const buycreditsRoute = require('./routes/purchaseCredits.routes');

const app = express();

// Middlewares
// app.enable('trust proxy');

// Protection from Hackers
app.use(helmet());
app.use(xss());
app.use(cors());

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});

app.use('/v1/api/', limiter);

// cors
const whitelist = ['http://localhost:5000/'];
const corsOptions = {
  origin: function(origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.options('*', cors(corsOptions));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.static(`${__dirname}/public`));

app.use(express.json({ limit: '20kb' }));

app.use(cookieParser());

// API Routes
app.use('/v1/api/', userRoute);
app.use('/v1/api/', chatRoute);
app.use('/v1/api/owner', ownerRoute);
app.use('/v1/api/admin', adminRoute);
app.use('/v1/api/credits', buycreditsRoute);

/*
app.use('/v1/api/referal', referalRoute);
app.use('/v1/api/chat', socketRoute);
*/

app.all('*', (req, res, next) => {
  return next(new AppError("Can't find this Endpoint on the Server!", 404));
});

app.use(globalErorHandler);

module.exports = app;
