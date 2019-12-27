const express = require('express');

const authController = require('../controller/authController');
const userController = require('../controller/userController');
// const chatController = require('../controller/chatController');

const router = express.Router();

router.post('/signup', authController.signUp);
router.post('/login', authController.login);

router.post('/forgotpassword', authController.forgotPassword);
router.patch('/resetpassword/:token', authController.resetPassword);

router.get('/verify/:id', userController.verifyUser);

router.use(authController.protect);

router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUser);

router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/updateMe',
  userController.getMe,
  userController.uploadUserImages,
  userController.resizeUserImages,
  userController.updateMe
);

router.get('/myfavourites', userController.getMe, userController.myFavourites);

router.post('/favouriteUser/:id', userController.favouriteUser);

router.get('/referal/link/:adminId', userController.referalLinkAttach);

module.exports = router;
