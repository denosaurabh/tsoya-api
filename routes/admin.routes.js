const express = require('express');
const adminController = require('../controller/adminController');
const authController = require('../controller/authController');
const userController = require('../controller/userController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('admin'));

router.route('/').get(adminController.users);

router
  .route('/profiles')
  .get(adminController.myFakeProfiles)
  .post(adminController.makeUsers);

router.route('/profile').post(adminController.chatLoginAdminProfile);

router
  .route('/profile/:id')
  .get(adminController.adminProfileLogin)
  .patch(
    adminController.isActionFakeUserAdmin,
    userController.uploadUserImages,
    userController.resizeUserImages,
    adminController.updatemyFakeUser
  );

router.route('/myreferalLink').get(adminController.myreferalLink);

module.exports = router;
