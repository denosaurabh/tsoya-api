const express = require('express');
const authController = require('../controller/authController');

const router = express.Router();

router.get('/link/:link', authController.referalLink, authController.signUp);

module.exports = router;
