const express = require('express');

const authController = require('../controller/authController');
const chatController = require('../controller/chatController');

const router = express.Router();

router.use(authController.protect);

router.post('/users/:id/chat', chatController.buildRoom);

router.get('/rooms', chatController.myRooms);

router
  .route('/room/:id')
  .get(chatController.getRoom)
  .post(chatController.sendMessage); // chatController.uploadUserFile, 

router.route('/room/:id/messages').get(chatController.getMessages);

router.route('/room/:id/cursors').get(chatController.getReadCursorsRoom);

router.route('/inbox').get(chatController.getReadCursorsUser);

router
  .route('/room/:roomId/messages/:messageId')
  .post(chatController.banUser)
  .delete(chatController.deleteMessage);

module.exports = router;
