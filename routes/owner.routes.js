const express = require('express');
const authController = require('../controller/authController');
const ownerController = require('../controller/owner.controller');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('owner')); // , authController.restrictTo('owner')

router
  .route('/admin')
  .get(ownerController.allAdmins)
  .post(ownerController.createAdmin);

router.delete(
  '/admin/:id',
  ownerController.isActionedUserAdmin,
  ownerController.removeAdmin
);

router.patch(
  '/admin/:id',
  ownerController.isActionedUserAdmin,
  ownerController.updateAdmin
);

router.patch(
  '/ban/:id',
  ownerController.isActionedUserAdmin,
  ownerController.banAdmin
);

router.route('/ban/messages').get(ownerController.banningMessages);

router
  .route('/referalLink/:id')
  .post(ownerController.isActionedUserAdmin, ownerController.createReferalLink);

module.exports = router;
