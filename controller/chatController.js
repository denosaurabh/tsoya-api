const multer = require('multer');
const chatkit = require('../utils/chatkit');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const storage = multer.memoryStorage();

const upload = multer({ storage });

exports.uploadUserFile = upload.single('file');

// Room Controller
exports.buildRoom = catchAsync(async (req, res, next) => {
  const user = await chatkit.getUser({ id: req.params.id });

  try {
    await chatkit.getRoom({
      roomId: `${req.user.name}-${user.name}`
    });
  } catch (err) {
    return next(
      new AppError(
        'The chat room with this user is already in your rooms!',
        400
      )
    );
  }

  const room = await chatkit.createRoom({
    id: `${req.user.name}-${user.name}`,
    creatorId: req.user.id,
    name: `${req.user.name}-${user.name}`,
    isPrivate: true,
    userIds: [req.user.id, req.params.id]
  });

  res.status(201).json({
    status: 'success',
    data: {
      room
    }
  });
});

exports.myRooms = catchAsync(async (req, res, next) => {
  const myRooms = await chatkit.getUserRooms({
    userId: req.user.id
  });

  res.status(200).json({
    status: 'success',
    results: myRooms.length,
    data: {
      myRooms
    }
  });
});

exports.getRoom = catchAsync(async (req, res, next) => {
  const room = await chatkit.getRoom({
    roomId: req.params.id
  });

  res.status(200).json({
    status: 'success',
    data: {
      room
    }
  });
});

exports.getReadCursorsRoom = catchAsync(async (req, res, next) => {
  const readCursors = await chatkit.getReadCursorsForRoom({
    roomId: req.params.id
  });

  res.status(200).json({
    status: 'success',
    data: {
      readCursors
    }
  });
});

exports.getReadCursorsUser = catchAsync(async (req, res, next) => {
  const cursors = chatkit.getReadCursorsForUser({
    userId: req.user.id
  });

  res.status(200).json({
    status: 'success',
    data: { cursors }
  });
});

// Messages Controller
exports.sendMessage = catchAsync(async (req, res, next) => {
  if (!req.body.message) {
    return next(new AppError('Please provide a message to send!', 400));
  }

  if (req.user.custom_data.role === 'user') {
    if (req.user.custom_data.credits < 40) {
      return next(
        new AppError('You have no enough Credits to send a message!')
      );
    }

    if (req.user.custom_data.role === 'admin') {
      if (req.body.message.length > 255) {
        return next(
          new AppError(
            'Your message is too long! Make it within 255 characters',
            400
          )
        );
      }
    }

    // Taking out Credits (only for Users, not Admins or Owners)
    await chatkit.updateUser({
      id: req.user.id,
      name: req.user.name,
      customData: {
        ...req.user.custom_data,
        credits: req.user.custom_data.credits - 40
      }
    });
  }

  let message;
  // Sending Message
  if (!req.file) {
    message = await chatkit.sendSimpleMessage({
      userId: req.user.id,
      roomId: req.params.id,
      text: req.body.message
    });
  } else {
    // If there any Image

    console.log(req.file);
    const { mimetype } = req.file;

    message = await chatkit.sendMultipartMessage({
      roomId: req.params.id,
      userId: req.user.id,
      parts: [
        {
          type: 'text/plain',
          content: req.user.message
        },
        {
          type: 'text/html',
          url: 'https://google.com/'
        },
        {
          type: mimetype,
          file: req.file.buffer
        }
      ]
    });
  }

  /* {
     type: 'text/plain',
     url: `${req.protocol}://${req.get('host')}/v1/api`
     },
 */

  // Setting Read Cursors
  await chatkit.setReadCursor({
    userId: req.user.id,
    roomId: req.params.id,
    position: message.message_id
  });

  res.status(200).json({
    status: 'success',
    data: {
      message
    }
  });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  const messages = await chatkit.fetchMultipartMessages({
    roomId: req.params.id,
    limit: 10,
    direction: 'older'
  });

  res.status(200).json({
    status: 'success',
    data: {
      messages
    }
  });
});

exports.deleteMessage = catchAsync(async (req, res, next) => {
  await chatkit.deleteMessage({
    roomId: req.params.roomId,
    messageId: req.params.messageId
  });

  res.status(404).json({
    status: 'success',
    data: null
  });
});

exports.banUser = catchAsync(async (req, res, next) => {
  const { roomId, messageId } = req.params;

  const illigalMessage = await chatkit.fetchMultipartMessage({
    roomId,
    messageId
  });

  const illigalMessageStr = JSON.stringify(illigalMessage);

  const message = await chatkit.sendSimpleMessage({
    userId: req.user.id,
    roomId: '8f2a2cbe-5fec-4e54-b7a0-5bda4a78639c',
    text: illigalMessageStr
  });

  res.status(201).json({
    status: 'success',
    data: {
      message
    }
  });
});
