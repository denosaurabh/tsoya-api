const express = require('express');

const authController = require('../controller/authController');
const userController = require('../controller/userController');

const router = express.Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.login);

router.post('/forgotpassword', authController.forgotPassword);
router.patch('/resetpassword/:token', authController.resetPassword);

router.use(authController.protect);

router.post('/chatlogin', authController.chatLogin);

router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUser);

router.get('/me', userController.getMe, userController.getUser);
router.get('/myfavourites', userController.getMe, userController.myFavourites);

router.post('/favouriteUser/:id', userController.favouriteUser);

router
  .route('/room')
  .post(userController.createRoom)
  .patch(userController.updateRoom);

router.patch(
  '/updateMe',
  userController.uploadUserImages,
  userController.resizeUserImages,
  userController.updateMe
);

module.exports = router;
