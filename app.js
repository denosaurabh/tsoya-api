const express = require('express');

const morgan = require('morgan');

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const globalErorHandler = require('./controller/errorController');
const AppError = require('./utils/appError');

const userRoute = require('./routes/user.routes');
const buycreditsRoute = require('./routes/purchaseCredits.routes');
const ownerRoute = require('./routes/owner.routes');
const adminRoute = require('./routes/admin.routes');

const app = express();

// API Security and Perforance
app.enable('trust proxy');
app.use(cors());
app.options('*', cors());

app.use(helmet());

// Middlewares
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limiting the Data
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security from Query Injection & Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Data compression
app.use(compression());

app.use(express.static(`${__dirname}/public`));

// API Routes
app.use('/v1/api/', userRoute);
app.use('/v1/api/owner', ownerRoute);
app.use('/v1/api/admin', adminRoute);
app.use('/v1/api/credits', buycreditsRoute);

app.all('*', (req, res, next) => {
  return next(new AppError("Can't find this Endpoint on the Server!", 404));
});

app.use(globalErorHandler);

module.exports = app;
