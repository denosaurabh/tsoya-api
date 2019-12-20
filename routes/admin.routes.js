const express = require('express');
const adminController = require('../controller/adminController');
const authController = require('../controller/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('admin'));

router.route('/profiles').post(adminController.makeUsers);

module.exports = router;