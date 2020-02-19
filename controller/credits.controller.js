const stripe = require('stripe')(process.env.STRIPE_SUPER_SECRET_KEY);
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const noOfCredits = req.params.noCredits;
  const userId = req.user._id;

  let amount;
  if (noOfCredits === '200') amount = 19;
  else if (noOfCredits === '900') amount = 49;
  else if (noOfCredits === '2000') amount = 99;
  else if (noOfCredits === '6000') amount = 198;
  else if (noOfCredits === '12500') amount = 398;
  else {
    return next(new AppError('No of Credits that you provided are not valid!', 400))
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/`,
    cancel_url: `${req.protocol}://${req.get('host')}/me`,
    customer_email: req.user.email,
    line_items: [
      {
        name: `${noOfCredits} credits, ${req.user.name}`,
        description: `Credits to buy`,
        currency: 'eur',
        quantity: noOfCredits,
        amount
      }
    ]
  });

  res.status(200).json({
    status: 'success',
    session
  });
});
