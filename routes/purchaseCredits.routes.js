const express = require('express');
const authController = require('../controller/authController');
const buyCredits = require('../controller/credits.controller');

const router = express.Router();

router.get(
  '/checkout-session/:noCredits',
  authController.protect,
  buyCredits.getCheckoutSession
);

module.exports = router;
