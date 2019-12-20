const express = require('express');
const authController = require('../controller/authController');
const ownerController = require('../controller/owner.controller');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('owner'));

router.route('/admin').post(ownerController.createAdmin);

router.delete(
  '/admin/:id',
  ownerController.isActionedUserAdmin,
  ownerController.removeAdmin
);

router.patch(
  '/admin/:id',
  ownerController.isActionedUserAdmin,
  ownerController.passwordToHash,
  ownerController.updateAdmin
);

module.exports = router;
