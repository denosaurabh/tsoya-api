const express = require('express');
const authController = require('../controller/authController');
const ownerController = require('../controller/owner.controller');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('owner'));

router
  .route('/admin')
  .get(ownerController.allAdmins)
  .post(ownerController.createAdmin);

router.route('/referalLink/:adminId').get(ownerController.createReferalLink);

router
  .route('/admin/:id')
  .get(ownerController.isActionedUserAdmin, ownerController.getAdmin)
  .delete(ownerController.isActionedUserAdmin, ownerController.removeAdmin)
  .patch(
    ownerController.isActionedUserAdmin,
    ownerController.passwordToHash,
    ownerController.updateAdmin
  );

module.exports = router;
