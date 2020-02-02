const express = require('express');
const adminController = require('../controller/adminController');
const authController = require('../controller/authController');
const userController = require('../controller/userController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('admin'));

router
  .route('/logback')
  .get(adminController.protectFakeProfile, adminController.loginInBackToAdmin);

router
  .route('/profiles')
  .get(adminController.myFakeProfiles)
  .post(adminController.makeUsers);

router.route('/profiles/:id').post(adminController.loginwithFakeProfile);

router
  .route('/profile/:id')
  .patch(
    adminController.isActionFakeUserAdmin,
    userController.uploadUserImages,
    userController.resizeUserImages,
    adminController.updatemyFakeUser
  );

router.route('/profiles/transfer/:id').post(adminController.transferFakeUser);
router
  .route('/profiles/transfer/messages')
  .get(adminController.getProfilesOwnerShipsMessages);

router
  .route('/profiles/transfer/messages/:id')
  .get(adminController.getOwnerShipUser);

/*
router
  .route('/online/profile/:id')
  .patch(adminController.isActionFakeUserAdmin, adminController.toggleOnline);
*/

router.route('/myreferalLink').get(adminController.myreferalLink);

module.exports = router;
